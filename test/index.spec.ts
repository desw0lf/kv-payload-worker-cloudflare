import { describe, it, expect } from "vitest";
import { createExecutionContext, waitOnExecutionContext, env } from "cloudflare:test";
import worker from "../src/index"; // adjust path if needed
import { generateHmac } from "../generate-hmac.js";

const TEST_SECRET = env.WORKER_SECRET ||"your_shared_secret";
const TEST_UID = "user_123";
const TEST_DATA = { exampleField: "exampleValue" };
const TEST_HMAC = generateHmac(TEST_SECRET, TEST_UID);

const WORKER_URL = "http://worker.local"; // "http://127.0.0.1:8787";

describe("Generic Storage Worker", () => {
  it("should accept a batch update and retrieve it correctly", async () => {
    const ctx = createExecutionContext();
    
    // 1. Simulate batch update POST
    const updateRequest = new Request(`${WORKER_URL}/update/batch`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TEST_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          {
            uid: TEST_UID,
            hmac: TEST_HMAC,
            ...TEST_DATA,
          }
        ]
      })
    });

    const updateResponse = await worker.fetch(updateRequest, env, ctx);
    expect(updateResponse.status).toBe(200);
    await waitOnExecutionContext(ctx);

    const updateText = await updateResponse.text();
    expect(updateText).toMatchInlineSnapshot(`"{\"message\":\"Batch saved\",\"saved\":1}"`);

    // 2. Simulate GET latest/{hmac}
    const getRequest = new Request(`${WORKER_URL}/fetch/${TEST_HMAC}`);
    const getResponse = await worker.fetch(getRequest, env, ctx);
    expect(getResponse.status).toBe(200);

    const getJson: any = await getResponse.json();
    expect(getJson.uid).toBe(TEST_UID);
    expect(getJson.exampleField).toBe(TEST_DATA.exampleField);
  });

  it("should respond OK to healthz", async () => {
    const ctx = createExecutionContext();
    const healthRequest = new Request(`${WORKER_URL}/healthz`);
    const healthResponse = await worker.fetch(healthRequest, env, ctx);

    expect(healthResponse.status).toBe(200);
    const text = await healthResponse.text();
    expect(text).toEqual("OK");
  });
});
