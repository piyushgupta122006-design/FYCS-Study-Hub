export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  } else if (!body) {
    body = {};
  }

  const BREVO_API_KEY = process.env.VITE_BREVO_API_KEY || process.env.BREVO_API_KEY;
  const BREVO_SENDER_EMAIL = process.env.VITE_BREVO_SENDER_EMAIL || process.env.BREVO_SENDER_EMAIL || "rishiuttamsahu@gmail.com";
  const BREVO_SENDER_NAME = process.env.VITE_BREVO_SENDER_NAME || process.env.BREVO_SENDER_NAME || "BNN CS Study Hub";

  if (!BREVO_API_KEY) {
    console.error("VITE_BREVO_API_KEY / BREVO_API_KEY is not configured.");
    return res.status(500).json({ error: "Server Configuration Error: Brevo API key is not configured in environment variables." });
  }

  const action = body.action || (body.email ? "sendSingle" : (body.recipients ? "sendBatch" : "checkQuota"));

  if (action === "checkQuota") {
    try {
      const response = await fetch("https://api.brevo.com/v3/account", {
        method: "GET",
        headers: {
          "accept": "application/json",
          "api-key": BREVO_API_KEY
        }
      });
      if (!response.ok) {
        throw new Error(`Brevo API returned status ${response.status}`);
      }
      const data = await response.json();
      const sendLimitPlan = data.plan?.find(p => p.creditsType === "sendLimit");
      const remaining = sendLimitPlan ? sendLimitPlan.credits : 0;
      return res.status(200).json({ remaining });
    } catch (error) {
      console.error("Quota check failed:", error);
      return res.status(500).json({ error: error.message, remaining: 0 });
    }
  }

  if (action === "sendBatch") {
    const { recipients = [], subject, messageHtml, dryRun } = body;
    if (recipients.length === 0) {
      return res.status(200).json({ sent: [], failed: [] });
    }

    if (dryRun) {
      console.log(`[Dry Run] Simulating batch email sending to ${recipients.length} recipients.`);
      return res.status(200).json({
        sent: recipients.map(r => r.email),
        failed: []
      });
    }

    try {
      // Map recipients to Brevo's messageVersions
      const messageVersions = recipients.map(r => ({
        to: [{ email: r.email }]
      }));

      const payload = {
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL
        },
        subject: subject,
        htmlContent: messageHtml,
        messageVersions: messageVersions
      };

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": BREVO_API_KEY
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Brevo sending failed:", responseData);
        return res.status(response.status).json({
          sent: [],
          failed: recipients.map(r => r.email),
          error: responseData.message || "Failed to send email via Brevo"
        });
      }

      return res.status(200).json({
        sent: recipients.map(r => r.email),
        failed: []
      });
    } catch (error) {
      console.error("Error in sendBatch:", error);
      return res.status(500).json({
        sent: [],
        failed: recipients.map(r => r.email),
        error: error.message
      });
    }
  }

  if (action === "sendSingle") {
    const { email, subject, messageHtml } = body;
    try {
      const payload = {
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL
        },
        to: [{ email }],
        subject: subject,
        htmlContent: messageHtml
      };

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": BREVO_API_KEY
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("Brevo sending failed:", responseData);
        return res.status(response.status).json({
          success: false,
          error: responseData.message || "Failed to send email via Brevo"
        });
      }

      return res.status(200).json({ success: true, messageId: responseData.messageId });
    } catch (error) {
      console.error("Error in sendSingle:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(400).json({ error: "Unknown action" });
}
