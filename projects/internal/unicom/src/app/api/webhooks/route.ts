export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Process incoming webhook
    console.log("Webhook received:", body);

    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return Response.json({ status: "error", message: "Internal server error" }, { status: 500 });
  }
}
