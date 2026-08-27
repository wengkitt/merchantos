import { env } from "cloudflare:workers";
import { analyzeFulfillmentRisk, approveProductionPlan, approvePurchaseDraft, createOperationsDraft, getOperationsData, receiveInventory, updateOrderStatus } from "@/lib/merchant-service";
import type { OrderStatus } from "@/lib/merchant-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return Response.json(await getOperationsData(env.MERCHANTOS_DB)); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load MerchantOS" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Record<string, unknown>;
    const action = String(input.action ?? "");
    let result: unknown;
    if (action === "analyze_fulfillment_risk") result = await analyzeFulfillmentRisk(env.MERCHANTOS_DB);
    else if (action === "create_operations_draft") result = await createOperationsDraft(env.MERCHANTOS_DB, input.actor === "Human" ? "Human" : "Agent");
    else if (action === "update_order_status") result = await updateOrderStatus(env.MERCHANTOS_DB, String(input.orderId), String(input.status) as OrderStatus, input.actor === "Human" ? "Human" : "Agent");
    else if (action === "receive_inventory") result = await receiveInventory(env.MERCHANTOS_DB, String(input.productId), Number(input.quantity), input.actor === "Agent" ? "Agent" : "Human");
    else if (action === "approve_production_plan") result = await approveProductionPlan(env.MERCHANTOS_DB, String(input.planId));
    else if (action === "approve_purchase_draft") result = await approvePurchaseDraft(env.MERCHANTOS_DB, String(input.draftId));
    else return Response.json({ error: "Unsupported action" }, { status: 400 });
    return Response.json({ result, data: await getOperationsData(env.MERCHANTOS_DB) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "MerchantOS action failed" }, { status: 400 }); }
}
