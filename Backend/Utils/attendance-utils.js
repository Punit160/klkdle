const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const getISTParts = (date = new Date()) => {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();

  return { year, month, day, hour, minute };
};

export const getISTDateString = (date = new Date()) => {
  const { year, month, day } = getISTParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const istDateToUTCDate = (dateStr) => {
  return new Date(`${dateStr}T00:00:00+05:30`);
};

export const AUTO_PUNCH_OUT_HOURS = 10;
export const AUTO_PUNCH_OUT_MS = AUTO_PUNCH_OUT_HOURS * 60 * 60 * 1000;

export const getAutoPunchOutTime = (punchInAt) => {
  if (!punchInAt) return null;
  return new Date(new Date(punchInAt).getTime() + AUTO_PUNCH_OUT_MS);
};

export const shouldAutoPunchOut = (record, now = new Date()) => {
  if (!record?.punch_in_at || record.punch_out_at) return false;
  const autoOutAt = getAutoPunchOutTime(record.punch_in_at);
  return now.getTime() >= autoOutAt.getTime();
};

export const serializeAttendance = (record) => {
  if (!record) return null;

  return {
    id: record.id?.toString?.() ?? record.id,
    user_id: record.user_id?.toString?.() ?? record.user_id,
    company_id: record.company_id,
    attendance_date: getISTDateString(record.attendance_date),
    punch_in_at: record.punch_in_at,
    punch_in_latitude: record.punch_in_latitude,
    punch_in_longitude: record.punch_in_longitude,
    punch_out_at: record.punch_out_at,
    punch_out_latitude: record.punch_out_latitude,
    punch_out_longitude: record.punch_out_longitude,
    punch_out_auto: record.punch_out_auto === 1,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
};
