import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { normalizeRecurringDate } from "@/lib/recurring";

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

async function loadRuleForUser(userId, id) {
  return prisma.recurringTransaction.findFirst({
    where: {
      id,
      userId,
    },
  });
}

export async function PATCH(request, context) {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const params = await context.params;
    const id = String(params?.id || "").trim();
    if (!id) {
      return NextResponse.json({ message: "Recurring id is required." }, { status: 400 });
    }

    const rule = await loadRuleForUser(user.id, id);
    if (!rule) {
      return NextResponse.json({ message: "Recurring transaction not found." }, { status: 404 });
    }

    const body = await request.json();
    const action = String(body.action || "").trim().toLowerCase();
    const hasActiveFlag = typeof body.isActive === "boolean";

    if (!action && !hasActiveFlag) {
      return NextResponse.json(
        { message: "Provide `action` (pause/resume) or `isActive`." },
        { status: 400 }
      );
    }

    let nextIsActive = rule.isActive;
    if (action === "pause") {
      nextIsActive = false;
    } else if (action === "resume") {
      nextIsActive = true;
    } else if (hasActiveFlag) {
      nextIsActive = body.isActive;
    }

    const updateData = {
      isActive: nextIsActive,
    };

    if (nextIsActive) {
      const today = startOfDay(new Date());
      const nextRun = normalizeRecurringDate(rule.nextRunDate) || today;
      if (nextRun < today) {
        updateData.nextRunDate = today;
      }
    }

    const updated = await prisma.recurringTransaction.update({
      where: { id: rule.id },
      data: updateData,
      include: {
        account: { select: { id: true, name: true, currency: true } },
        category: { select: { id: true, name: true, type: true, icon: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update recurring transaction.", error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, context) {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const params = await context.params;
    const id = String(params?.id || "").trim();
    if (!id) {
      return NextResponse.json({ message: "Recurring id is required." }, { status: 400 });
    }

    const rule = await loadRuleForUser(user.id, id);
    if (!rule) {
      return NextResponse.json({ message: "Recurring transaction not found." }, { status: 404 });
    }

    await prisma.recurringTransaction.delete({
      where: { id: rule.id },
    });

    return NextResponse.json({ message: "Recurring transaction deleted." });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete recurring transaction.", error: String(error) },
      { status: 500 }
    );
  }
}
