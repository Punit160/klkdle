import prisma from "../../../Config/Prisma.js";
import { findUserById } from "../../../Model/DLE-Model/dle-user-model.js";
import { AMC_DOC_APPROVAL } from "../../../Utils/amcApproval.js";
import { resolveJwtUserId } from "../../../Utils/requestUser.js";

export const ULA_CENTRAL_PAYMENT = 33000;
export const ULA_STATE_PAYMENT = 10000;
export const ULA_SITE_PAYMENT = ULA_CENTRAL_PAYMENT + ULA_STATE_PAYMENT;

const money = (value) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
};

const flag = (value) => (value ? 1 : 0);

const actorName = async (req) => {
  const actorId = resolveJwtUserId(req);
  const named = String(req.actorUser?.name || req.user?.name || "").trim();
  if (named) return named;
  if (!actorId) return "admin";
  const actor = await findUserById(actorId);
  return String(actor?.name || actorId);
};

const surveyIdOf = (value) => {
  const id = String(value || "").trim();
  if (!/^\d+$/.test(id)) return null;
  return BigInt(id);
};

const approvedSiteWhere = (search) => {
  const approved = { approval_status: AMC_DOC_APPROVAL.APPROVED };
  const q = String(search || "").trim();
  if (!q) return approved;
  return {
    AND: [
      approved,
      {
        OR: [
          { ca_no: { contains: q } },
          { ca_name: { contains: q } },
          { beneficiary_name: { contains: q } },
          { district: { contains: q } },
          { village: { contains: q } },
        ],
      },
    ],
  };
};

const paymentOf = (row) => ({
  central_received: Number(row?.central_received ?? 0) === 1,
  state_received: Number(row?.state_received ?? 0) === 1,
  updated_by: row?.updated_by || "",
  updated_at: row?.updated_at || null,
});

const collectedOf = (payment) =>
  (payment.central_received ? ULA_CENTRAL_PAYMENT : 0) +
  (payment.state_received ? ULA_STATE_PAYMENT : 0);

export const attachUlaPaymentFields = async (rows) => {
  if (!rows?.length) return rows || [];
  const ids = rows.map((row) => BigInt(row.id));
  const [payments, expenses] = await Promise.all([
    prisma.biharUlaSitePayment.findMany({ where: { survey_id: { in: ids } } }),
    prisma.biharUlaSiteExpense.groupBy({
      by: ["survey_id"],
      where: { survey_id: { in: ids } },
      _sum: { amount: true },
    }),
  ]);
  const paymentBySite = new Map(payments.map((row) => [row.survey_id.toString(), row]));
  const expenseBySite = new Map(
    expenses.map((row) => [row.survey_id.toString(), money(row._sum.amount)])
  );
  return rows.map((row) => {
    const key = String(row.id);
    const payment = paymentOf(paymentBySite.get(key));
    const received = collectedOf(payment);
    const expense = expenseBySite.get(key) || 0;
    return {
      ...row,
      central_received: payment.central_received,
      state_received: payment.state_received,
      full_payment: payment.central_received && payment.state_received,
      payment_expected: ULA_SITE_PAYMENT,
      payment_collected: received,
      payment_pending: ULA_SITE_PAYMENT - received,
      payment_expense: expense,
      payment_balance: money(received - expense),
    };
  });
};

export const listBiharUlaPayments = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 15, 1), 50);
    const approvedIds = (
      await prisma.biharUlaSurvey.findMany({
        where: { approval_status: AMC_DOC_APPROVAL.APPROVED },
        select: { id: true },
      })
    ).map((row) => row.id);
    const siteCount = approvedIds.length;
    const paymentScope = { survey_id: { in: approvedIds } };
    const where = approvedSiteWhere(req.query.search);
    const [centralCount, stateCount, fullCount, expenseSum, total, rows] =
      await Promise.all([
        siteCount
          ? prisma.biharUlaSitePayment.count({
              where: { ...paymentScope, central_received: 1 },
            })
          : 0,
        siteCount
          ? prisma.biharUlaSitePayment.count({
              where: { ...paymentScope, state_received: 1 },
            })
          : 0,
        siteCount
          ? prisma.biharUlaSitePayment.count({
              where: { ...paymentScope, central_received: 1, state_received: 1 },
            })
          : 0,
        siteCount
          ? prisma.biharUlaSiteExpense.aggregate({
              where: paymentScope,
              _sum: { amount: true },
            })
          : { _sum: { amount: null } },
        prisma.biharUlaSurvey.count({ where }),
        prisma.biharUlaSurvey.findMany({
          where,
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            ca_no: true,
            ca_name: true,
            beneficiary_name: true,
            district: true,
            block: true,
            village: true,
          },
        }),
      ]);

    const ids = rows.map((row) => row.id);
    const [payments, expenses] = await Promise.all([
      ids.length
        ? prisma.biharUlaSitePayment.findMany({ where: { survey_id: { in: ids } } })
        : [],
      ids.length
        ? prisma.biharUlaSiteExpense.findMany({
            where: { survey_id: { in: ids } },
            orderBy: [{ created_at: "desc" }, { id: "desc" }],
          })
        : [],
    ]);
    const paymentBySite = new Map(payments.map((row) => [row.survey_id.toString(), row]));
    const expensesBySite = new Map();
    expenses.forEach((row) => {
      const key = row.survey_id.toString();
      const list = expensesBySite.get(key) || [];
      list.push(row);
      expensesBySite.set(key, list);
    });

    const collected =
      centralCount * ULA_CENTRAL_PAYMENT + stateCount * ULA_STATE_PAYMENT;
    const expected = siteCount * ULA_SITE_PAYMENT;
    const expenseTotal = money(expenseSum._sum.amount);

    return res.json({
      success: true,
      summary: {
        sites: siteCount,
        central_amount: ULA_CENTRAL_PAYMENT,
        state_amount: ULA_STATE_PAYMENT,
        site_amount: ULA_SITE_PAYMENT,
        central_received_count: centralCount,
        state_received_count: stateCount,
        full_payment_count: fullCount,
        pending_payment_count: Math.max(siteCount - fullCount, 0),
        expected,
        collected,
        pending: Math.max(expected - collected, 0),
        expense: expenseTotal,
        balance: money(collected - expenseTotal),
      },
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
      data: rows.map((row) => {
        const key = row.id.toString();
        const payment = paymentOf(paymentBySite.get(key));
        const siteExpenses = expensesBySite.get(key) || [];
        const expense = money(siteExpenses.reduce((sum, item) => sum + money(item.amount), 0));
        const received = collectedOf(payment);
        return {
          id: key,
          ca_no: row.ca_no,
          consumer_name: row.ca_name || row.beneficiary_name || "",
          district: row.district || "",
          block: row.block || "",
          village: row.village || "",
          ...payment,
          full_payment: payment.central_received && payment.state_received,
          expected: ULA_SITE_PAYMENT,
          collected: received,
          pending: ULA_SITE_PAYMENT - received,
          expense,
          balance: money(received - expense),
          expenses: siteExpenses.map((item) => ({
            id: item.id.toString(),
            amount: money(item.amount),
            remarks: item.remarks,
            created_by: item.created_by || "",
            created_at: item.created_at,
          })),
        };
      }),
    });
  } catch (error) {
    console.error("BIHAR ULA PAYMENT LIST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load site payments.",
    });
  }
};

export const getBiharUlaSitePayment = async (req, res) => {
  try {
    const surveyId = surveyIdOf(req.params.surveyId);
    if (!surveyId) {
      return res.status(422).json({ success: false, message: "Valid site id is required." });
    }
    const survey = await prisma.biharUlaSurvey.findUnique({
      where: { id: surveyId },
      select: {
        id: true,
        ca_no: true,
        ca_name: true,
        beneficiary_name: true,
        district: true,
        block: true,
        village: true,
      },
    });
    if (!survey) {
      return res.status(404).json({ success: false, message: "ULA site not found." });
    }
    const [attached] = await attachUlaPaymentFields([
      {
        id: survey.id.toString(),
        ca_no: survey.ca_no,
        consumer_name: survey.ca_name || survey.beneficiary_name || "",
        district: survey.district || "",
        block: survey.block || "",
        village: survey.village || "",
      },
    ]);
    const expenses = await prisma.biharUlaSiteExpense.findMany({
      where: { survey_id: surveyId },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
    });
    return res.json({
      success: true,
      data: {
        ...attached,
        expenses: expenses.map((item) => ({
          id: item.id.toString(),
          amount: money(item.amount),
          remarks: item.remarks,
          created_by: item.created_by || "",
          created_at: item.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("BIHAR ULA PAYMENT VIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not load this site payment.",
    });
  }
};

export const updateBiharUlaSitePayment = async (req, res) => {
  try {
    const surveyId = surveyIdOf(req.params.surveyId);
    if (!surveyId) {
      return res.status(422).json({ success: false, message: "Valid site id is required." });
    }
    const survey = await prisma.biharUlaSurvey.findUnique({
      where: { id: surveyId },
      select: { id: true },
    });
    if (!survey) {
      return res.status(404).json({ success: false, message: "ULA site not found." });
    }
    const current = await prisma.biharUlaSitePayment.findUnique({
      where: { survey_id: surveyId },
    });
    const body = req.body || {};
    const data = {
      central_received:
        body.central_received == null
          ? Number(current?.central_received ?? 0)
          : flag(body.central_received),
      state_received:
        body.state_received == null
          ? Number(current?.state_received ?? 0)
          : flag(body.state_received),
      updated_by: await actorName(req),
      updated_at: new Date(),
    };
    const saved = current
      ? await prisma.biharUlaSitePayment.update({ where: { survey_id: surveyId }, data })
      : await prisma.biharUlaSitePayment.create({ data: { survey_id: surveyId, ...data } });
    const payment = paymentOf(saved);
    return res.json({
      success: true,
      message: "Site payment updated.",
      data: {
        ...payment,
        collected: collectedOf(payment),
        pending: ULA_SITE_PAYMENT - collectedOf(payment),
        full_payment: payment.central_received && payment.state_received,
      },
    });
  } catch (error) {
    console.error("BIHAR ULA PAYMENT UPDATE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not update this site payment.",
    });
  }
};

export const addBiharUlaSiteExpense = async (req, res) => {
  try {
    const surveyId = surveyIdOf(req.params.surveyId);
    if (!surveyId) {
      return res.status(422).json({ success: false, message: "Valid site id is required." });
    }
    const survey = await prisma.biharUlaSurvey.findUnique({
      where: { id: surveyId },
      select: { id: true },
    });
    if (!survey) {
      return res.status(404).json({ success: false, message: "ULA site not found." });
    }
    const amount = money(req.body?.amount);
    const remarks = String(req.body?.remarks || "").trim();
    if (amount <= 0) {
      return res.status(422).json({ success: false, message: "Enter an expense amount greater than 0." });
    }
    if (!remarks) {
      return res.status(422).json({ success: false, message: "Remarks are required for an expense." });
    }
    const saved = await prisma.biharUlaSiteExpense.create({
      data: {
        survey_id: surveyId,
        amount: amount.toFixed(2),
        remarks: remarks.slice(0, 1000),
        created_by: await actorName(req),
      },
    });
    return res.status(201).json({
      success: true,
      message: "Site expense added.",
      data: {
        id: saved.id.toString(),
        amount: money(saved.amount),
        remarks: saved.remarks,
        created_by: saved.created_by || "",
        created_at: saved.created_at,
      },
    });
  } catch (error) {
    console.error("BIHAR ULA EXPENSE ADD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not add this expense.",
    });
  }
};

export const deleteBiharUlaSiteExpense = async (req, res) => {
  try {
    const expenseId = surveyIdOf(req.params.expenseId);
    if (!expenseId) {
      return res.status(422).json({ success: false, message: "Valid expense id is required." });
    }
    const existing = await prisma.biharUlaSiteExpense.findUnique({ where: { id: expenseId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }
    await prisma.biharUlaSiteExpense.delete({ where: { id: expenseId } });
    return res.json({ success: true, message: "Site expense removed." });
  } catch (error) {
    console.error("BIHAR ULA EXPENSE DELETE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Could not remove this expense.",
    });
  }
};
