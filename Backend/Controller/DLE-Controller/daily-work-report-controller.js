import prisma from "../../Config/Prisma.js";
import { istDateToUTCDate, getISTDateString } from "../../Utils/attendance-utils.js";
import { isUserMasterAdmin } from "../../Utils/userRoles.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const dayWindow = (dateStr) => {
  const start = istDateToUTCDate(dateStr);
  const end = new Date(start.getTime() + DAY_MS);
  return { start, end };
};

const metersBetween = (a, b) => {
  const lat1 = Number(a?.latitude);
  const lon1 = Number(a?.longitude);
  const lat2 = Number(b?.latitude);
  const lon2 = Number(b?.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(Math.min(1, h)));
};

const pathDistanceKm = (points) => {
  const pins = points.filter(
    (point) => Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))
  );
  let meters = 0;
  for (let index = 1; index < pins.length; index += 1) {
    meters += metersBetween(pins[index - 1], pins[index]);
  }
  return Math.round((meters / 1000) * 100) / 100;
};

const placeLabel = (...parts) => parts.map((part) => String(part || "").trim()).filter(Boolean).join(" / ");

const monthWindow = (monthStr) => {
  const [year, month] = monthStr.split("-").map(Number);
  const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const start = istDateToUTCDate(startStr);
  const end = new Date(istDateToUTCDate(endStr).getTime() + DAY_MS);
  return { start, end };
};

const dayKeyOf = (value) => {
  if (!value) return "";
  return getISTDateString(new Date(value));
};

const ensureBucket = (map, userId, at) => {
  const day = dayKeyOf(at);
  const key = `${String(userId)}|${day}`;
  if (!map.has(key)) {
    map.set(key, {
      user_id: String(userId),
      date: day,
      name: "",
      punch_in_at: null,
      punch_in_latitude: null,
      punch_in_longitude: null,
      punch_out_at: null,
      punch_out_latitude: null,
      punch_out_longitude: null,
      punch_out_auto: false,
      sites: [],
    });
  }
  return map.get(key);
};

export const getDailyWorkReport = async (req, res) => {
  try {
    const portalCompanyId = String(req.portalCompanyId || "").trim();
    const viewerId = String(req.user?.id || "").trim();
    if (!viewerId && !portalCompanyId) {
      return res.status(401).json({ success: false, message: "Login required." });
    }

    const monthStr = String(req.query.month || "").trim();
    const hasDate = Boolean(String(req.query.date || "").trim());
    const monthMode = !hasDate && Boolean(monthStr);
    if (monthMode && !/^\d{4}-\d{2}$/.test(monthStr)) {
      return res.status(422).json({ success: false, message: "Month must be YYYY-MM." });
    }
    const dateStr = String(req.query.date || getISTDateString(new Date())).trim();
    if (!monthMode && !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(422).json({ success: false, message: "Date must be YYYY-MM-DD." });
    }

    const companyView = Boolean(portalCompanyId);
    const adminView = companyView || isUserMasterAdmin(req.user);
    const requestedUser = String(req.query.user_id || "").trim();
    const targetUserId = adminView ? requestedUser : viewerId;
    if (targetUserId && !/^\d+$/.test(targetUserId)) {
      return res.status(422).json({ success: false, message: "User id is not valid." });
    }
    const { start, end } = monthMode ? monthWindow(monthStr) : dayWindow(dateStr);
    const createdRange = { gte: start, lt: end };

    const companyFilter = portalCompanyId ? { company_id: portalCompanyId } : {};
    const attendanceWhere = {
      attendance_date: monthMode ? { gte: start, lt: end } : start,
      ...companyFilter,
      ...(targetUserId ? { user_id: BigInt(targetUserId) } : {}),
    };

    const userMatch = targetUserId ? String(targetUserId) : undefined;

    const [attendance, ulaFirst, ulaSecond, fieldAmc, biharDocs, upDocs] = await Promise.all([
      prisma.attendance.findMany({ where: attendanceWhere }),
      prisma.biharUlaSurvey.findMany({
        where: {
          created_at: createdRange,
          ...companyFilter,
          ...(userMatch ? { user_id: userMatch } : { user_id: { not: null } }),
        },
        select: {
          id: true,
          ca_no: true,
          ca_name: true,
          district: true,
          block: true,
          panchayat: true,
          village: true,
          latitude: true,
          longitude: true,
          user_id: true,
          created_at: true,
        },
      }),
      prisma.biharUlaSurvey.findMany({
        where: {
          second_visit_at: createdRange,
          ...companyFilter,
          ...(userMatch ? { user_id2: userMatch } : { user_id2: { not: null } }),
        },
        select: {
          id: true,
          ca_no: true,
          ca_name: true,
          district: true,
          block: true,
          panchayat: true,
          village: true,
          latitude2: true,
          longitude2: true,
          user_id2: true,
          second_visit_at: true,
        },
      }),
      prisma.biharLightAmc.findMany({
        where: {
          created_at: createdRange,
          ...companyFilter,
          ...(userMatch ? { user_id: userMatch } : {}),
        },
        select: {
          id: true,
          user_id: true,
          state: true,
          district: true,
          block: true,
          panchayat: true,
          unique_id: true,
          ssl_id: true,
          pole_no: true,
          latitude: true,
          longitude: true,
          light_working: true,
          created_at: true,
        },
      }),
      prisma.biharSslAmcUploadDocument.findMany({
        where: {
          created_at: createdRange,
          ...companyFilter,
          ...(targetUserId ? { created_by: BigInt(targetUserId) } : {}),
        },
        select: {
          id: true,
          created_by: true,
          created_at: true,
          biharSslAmc: { select: { district: true, block: true, panchayat: true, state: true } },
        },
      }),
      prisma.upSslAmcUploadDocument.findMany({
        where: {
          created_at: createdRange,
          ...companyFilter,
          ...(targetUserId ? { created_by: BigInt(targetUserId) } : {}),
        },
        select: {
          id: true,
          created_by: true,
          created_at: true,
          upSslAmc: { select: { district: true, block: true, panchayat: true, state: true } },
        },
      }),
    ]);

    const buckets = new Map();

    attendance.forEach((row) => {
      const bucket = ensureBucket(buckets, row.user_id, row.punch_in_at || row.attendance_date);
      bucket.punch_in_at = row.punch_in_at;
      bucket.punch_in_latitude = row.punch_in_latitude;
      bucket.punch_in_longitude = row.punch_in_longitude;
      bucket.punch_out_at = row.punch_out_at;
      bucket.punch_out_latitude = row.punch_out_latitude;
      bucket.punch_out_longitude = row.punch_out_longitude;
      bucket.punch_out_auto = row.punch_out_auto === 1;
    });

    ulaFirst.forEach((row) => {
      if (!row.user_id) return;
      const bucket = ensureBucket(buckets, row.user_id, row.created_at);
      bucket.sites.push({
        at: row.created_at,
        kind: "ULA 1st visit",
        title: row.ca_no || `ULA ${row.id}`,
        detail: row.ca_name || "",
        place: placeLabel(row.village, row.panchayat, row.block, row.district),
        latitude: row.latitude,
        longitude: row.longitude,
      });
    });

    ulaSecond.forEach((row) => {
      if (!row.user_id2) return;
      const bucket = ensureBucket(buckets, row.user_id2, row.second_visit_at);
      bucket.sites.push({
        at: row.second_visit_at,
        kind: "ULA 2nd visit",
        title: row.ca_no || `ULA ${row.id}`,
        detail: row.ca_name || "",
        place: placeLabel(row.village, row.panchayat, row.block, row.district),
        latitude: row.latitude2,
        longitude: row.longitude2,
      });
    });

    fieldAmc.forEach((row) => {
      if (!row.user_id) return;
      const bucket = ensureBucket(buckets, row.user_id, row.created_at);
      bucket.sites.push({
        at: row.created_at,
        kind: "Field AMC",
        title: row.unique_id || row.ssl_id || `AMC ${row.id}`,
        detail: row.light_working === "Yes" ? "Working" : "Not working",
        place: placeLabel(row.panchayat, row.block, row.district, row.state),
        latitude: row.latitude,
        longitude: row.longitude,
      });
    });

    const pushDoc = (row, parent, region) => {
      const bucket = ensureBucket(buckets, row.created_by, row.created_at);
      bucket.sites.push({
        at: row.created_at,
        kind: `${region} documentation`,
        title: placeLabel(parent?.panchayat, parent?.block) || "Document upload",
        detail: "",
        place: placeLabel(parent?.district, parent?.state),
        latitude: null,
        longitude: null,
      });
    };

    biharDocs.forEach((row) => pushDoc(row, row.biharSslAmc, "Bihar"));
    upDocs.forEach((row) => pushDoc(row, row.upSslAmc, "UP"));

    const includeSites = !monthMode || String(req.query.detail || "") === "1";
    const ids = [...new Set([...buckets.values()].map((bucket) => bucket.user_id))]
      .filter((id) => /^\d+$/.test(id))
      .map((id) => BigInt(id));
    const people = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        })
      : [];
    const names = new Map(people.map((person) => [person.id.toString(), person.name]));

    const days = [...buckets.values()]
      .map((bucket) => {
        bucket.sites.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
        const stillOpen = Boolean(bucket.punch_in_at) && !bucket.punch_out_at;
        const endAt = bucket.punch_out_at
          ? new Date(bucket.punch_out_at)
          : stillOpen && bucket.date === getISTDateString(new Date())
            ? new Date()
            : null;
        const durationMinutes =
          bucket.punch_in_at && endAt
            ? Math.max(0, Math.floor((endAt - new Date(bucket.punch_in_at)) / 60000))
            : null;
        const path = [];
        if (bucket.punch_in_latitude && bucket.punch_in_longitude) {
          path.push({
            latitude: bucket.punch_in_latitude,
            longitude: bucket.punch_in_longitude,
          });
        }
        bucket.sites.forEach((site) => {
          if (site.latitude && site.longitude) path.push(site);
        });
        if (bucket.punch_out_latitude && bucket.punch_out_longitude) {
          path.push({
            latitude: bucket.punch_out_latitude,
            longitude: bucket.punch_out_longitude,
          });
        }
        const day = {
          date: bucket.date,
          punch_in_at: bucket.punch_in_at,
          punch_in_latitude: bucket.punch_in_latitude,
          punch_in_longitude: bucket.punch_in_longitude,
          punch_out_at: bucket.punch_out_at,
          punch_out_latitude: bucket.punch_out_latitude,
          punch_out_longitude: bucket.punch_out_longitude,
          punch_out_auto: bucket.punch_out_auto,
          duration_minutes: durationMinutes,
          site_count: bucket.sites.length,
          ula_visits: bucket.sites.filter((site) => site.kind.startsWith("ULA")).length,
          field_amc: bucket.sites.filter((site) => site.kind === "Field AMC").length,
          documents: bucket.sites.filter((site) => site.kind.includes("documentation")).length,
          distance_km: pathDistanceKm(path),
          ...(includeSites
            ? {
                sites: bucket.sites,
                user_id: bucket.user_id,
                name: names.get(bucket.user_id) || `User ${bucket.user_id}`,
              }
            : {}),
        };
        return {
          user_id: bucket.user_id,
          name: names.get(bucket.user_id) || `User ${bucket.user_id}`,
          day,
        };
      });

    const scope = portalCompanyId ? "company" : adminView && !targetUserId ? "all" : "mine";

    if (!monthMode) {
      const users = days
        .map((entry) => entry.day)
        .sort((a, b) => a.name.localeCompare(b.name));
      return res.json({
        success: true,
        date: dateStr,
        scope,
        users,
      });
    }

    const byUser = new Map();
    days.forEach((entry) => {
      if (!byUser.has(entry.user_id)) {
        byUser.set(entry.user_id, {
          user_id: entry.user_id,
          name: entry.name,
          days: [],
        });
      }
      byUser.get(entry.user_id).days.push(entry.day);
    });

    const users = [...byUser.values()]
      .map((user) => {
        user.days.sort((a, b) => String(b.date).localeCompare(String(a.date)));
        const totalMinutes = user.days.reduce((sum, day) => sum + Number(day.duration_minutes || 0), 0);
        return {
          ...user,
          day_count: user.days.length,
          total_minutes: totalMinutes,
          total_sites: user.days.reduce((sum, day) => sum + day.site_count, 0),
          total_distance_km:
            Math.round(user.days.reduce((sum, day) => sum + Number(day.distance_km || 0), 0) * 100) / 100,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    let directory = [];
    if (adminView) {
      let companyId = portalCompanyId;
      if (!companyId && /^\d+$/.test(viewerId)) {
        const viewer = await prisma.user.findUnique({
          where: { id: BigInt(viewerId) },
          select: { company_id: true },
        });
        companyId = viewer?.company_id || "";
      }
      const staff = await prisma.user.findMany({
        where: {
          status: 1,
          ...(companyId ? { company_id: companyId } : {}),
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      directory = staff.map((person) => ({
        user_id: person.id.toString(),
        name: person.name,
      }));
    }

    return res.json({
      success: true,
      month: monthStr,
      scope,
      users,
      directory,
    });
  } catch (error) {
    console.error("DAILY WORK REPORT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load the daily work report.",
    });
  }
};
