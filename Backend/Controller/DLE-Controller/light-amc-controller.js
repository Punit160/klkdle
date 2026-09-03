import {
  createLightAmc,
  findLastLightAmc,
  findLightAmcById,
  findLightAmcs,
  findLightAmcsInPeriod,
  serializeLightAmc,
} from "../../Model/DLE-Model/light-amc-model.js";

const addMonths = (value, months) => {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return date;
};

const toISODate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const monthDiff = (from, to) => {
  const a = startOfDay(from);
  const b = startOfDay(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
};

const parseInstallDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getLastLightAmc = async (req, res) => {
  try {
    const sslId = req.query.ssl_id;
    const companyId = req.query.company_id;

    if (!sslId) {
      return res.status(400).json({
        success: false,
        message: "ssl_id is required",
      });
    }

    const last = await findLastLightAmc(sslId, companyId);
    const serialized = serializeLightAmc(last);

    let nextAmcDate = null;
    let periodStart = serialized?.period_start || null;
    let periodEnd = serialized?.period_end || null;

    if (serialized?.amc_date) {
      nextAmcDate = toISODate(addMonths(serialized.amc_date, 3));
    }

    return res.status(200).json({
      success: true,
      data: serialized
        ? {
            ...serialized,
            next_amc_date: nextAmcDate || serialized.next_amc_date,
            period_start: periodStart,
            period_end: periodEnd,
          }
        : null,
    });
  } catch (error) {
    console.error("GET LAST LIGHT AMC ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch last AMC",
    });
  }
};

export const getLightAmcs = async (req, res) => {
  try {
    const companyId = req.query.company_id;
    const state = req.query.state;

    const rows = await findLightAmcs({ companyId, state });

    return res.status(200).json({
      success: true,
      data: rows.map(serializeLightAmc),
    });
  } catch (error) {
    console.error("GET LIGHT AMCS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AMC records",
    });
  }
};

export const getLightAmcsInPeriod = async (req, res) => {
  try {
    const {
      company_id,
      district,
      block,
      panchayat,
      start_month_year,
      end_month_year,
    } = req.query;

    if (!start_month_year) {
      return res.status(400).json({
        success: false,
        message: "start_month_year is required",
      });
    }

    const rows = await findLightAmcsInPeriod({
      companyId: company_id,
      district,
      block,
      panchayat,
      startMonth: start_month_year,
      endMonth: end_month_year,
    });

    return res.status(200).json({
      success: true,
      data: rows.map((row) => {
        const serialized = serializeLightAmc(row);
        return {
          ssl_id: serialized.ssl_id,
          unique_id: serialized.unique_id,
          pole_no: serialized.pole_no,
          amc_date: serialized.amc_date,
          district: serialized.district,
          block: serialized.block,
          panchayat: serialized.panchayat,
        };
      }),
    });
  } catch (error) {
    console.error("GET LIGHT AMCS IN PERIOD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Light AMC records for this period",
    });
  }
};

export const getLightAmcById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.query.company_id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const row = await findLightAmcById(id, companyId);
    if (!row) {
      return res.status(404).json({
        success: false,
        message: "AMC record not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeLightAmc(row),
    });
  } catch (error) {
    console.error("GET LIGHT AMC BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch AMC record",
    });
  }
};

export const storeLightAmc = async (req, res) => {
  try {
    const {
      company_id,
      user_id,
      state,
      district,
      block,
      panchayat,
      ward_no,
      volume,
      ssl_id,
      unique_id,
      pole_no,
      amc_date,
      beneficiary_name,
      beneficiary_contact,
      light_working,
      complaint_raised,
      complaint_ref,
      remarks,
      date_of_installation,
    } = req.body;

    if (!company_id || !user_id || !ssl_id || !amc_date || !beneficiary_name || !beneficiary_contact || !light_working) {
      return res.status(400).json({
        success: false,
        message: "Required AMC fields are missing",
      });
    }

    const image1 = req.files?.image_1?.[0];
    const image2 = req.files?.image_2?.[0];

    if (!image1 || !image2) {
      return res.status(400).json({
        success: false,
        message: "Please upload 2 AMC images",
      });
    }

    const amcDate = startOfDay(amc_date);
    if (Number.isNaN(amcDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid AMC date",
      });
    }

    const last = await findLastLightAmc(ssl_id, company_id);
    const installDate = parseInstallDate(date_of_installation);

    let periodStart = last?.period_start
      ? startOfDay(last.period_start)
      : startOfDay(installDate || amcDate);
    const periodEnd = last?.period_end
      ? startOfDay(last.period_end)
      : addMonths(periodStart, 60);

    if (amcDate > periodEnd) {
      return res.status(400).json({
        success: false,
        message: "AMC period of 5 years has ended for this light",
      });
    }

    if (last?.amc_date) {
      const dueDate = startOfDay(addMonths(last.amc_date, 3));
      if (amcDate < dueDate) {
        return res.status(400).json({
          success: false,
          message: `Next AMC for this light is due on ${toISODate(dueDate)}`,
        });
      }
    }

    const nextAmcDate = addMonths(amcDate, 3);
    const months = Math.max(0, monthDiff(periodStart, amcDate));
    const quarterNo = Math.min(20, Math.floor(months / 3) + 1);

    const row = await createLightAmc({
      company_id,
      user_id,
      state: state || "",
      district,
      block,
      panchayat,
      ward_no,
      volume,
      ssl_id,
      unique_id,
      pole_no,
      amc_date: toISODate(amcDate),
      next_amc_date: toISODate(nextAmcDate),
      period_start: toISODate(periodStart),
      period_end: toISODate(periodEnd),
      quarter_no: quarterNo,
      beneficiary_name,
      beneficiary_contact,
      light_working,
      complaint_raised: String(complaint_raised) === "1" || String(complaint_raised).toLowerCase() === "true" || String(complaint_raised).toLowerCase() === "yes",
      complaint_ref,
      image_1: `/uploads/light-amc/${image1.filename}`,
      image_2: `/uploads/light-amc/${image2.filename}`,
      remarks,
    });

    return res.status(201).json({
      success: true,
      message: "Light AMC saved successfully",
      data: serializeLightAmc(row),
    });
  } catch (error) {
    console.error("STORE LIGHT AMC ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save AMC",
    });
  }
};
