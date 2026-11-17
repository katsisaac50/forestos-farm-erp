const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const ts = require("typescript");

const sourcePath = process.argv[2];
const source = fs.readFileSync(sourcePath, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const storage = new Map([
  ["forestos_token", "test-token-193"],
  ["forestos_organization_id", "org-test-001"],
  ["forestos_active_organization", "org-fallback-002"],
]);

let mockFetch;
const sandbox = {
  exports: {},
  require,
  process: { env: {} },
  window: {},
  localStorage: {
    getItem: key => storage.has(key) ? storage.get(key) : null,
  },
  fetch: (...args) => mockFetch(...args),
  Blob,
  FormData,
  Response,
  Headers,
  console,
};

vm.runInNewContext(compiled, sandbox);

const api = sandbox.exports;
const results = [];

function pass(name) {
  results.push({ name, passed: true });
  console.log("PASS: " + name);
}

async function test(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error("FAIL: " + name + " — " + error.message);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function main() {
  await test("GET sends bearer and organisation headers", async () => {
    mockFetch = async (url, init) => {
      assert(url.endsWith("/test-get"));
      assert.equal(init.method, "GET");
      assert.equal(init.headers.Authorization, "Bearer test-token-193");
      assert.equal(init.headers["X-Organization-Id"], "org-test-001");
      return jsonResponse({ ok: true });
    };

    const result = await api.getData("/test-get");
    assert.equal(result.ok, true);
  });

  await test("POST sends JSON body and content type", async () => {
    mockFetch = async (url, init) => {
      assert.equal(init.method, "POST");
      assert.equal(init.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(init.body), { name: "ForestOS" });
      return jsonResponse({ created: true });
    };

    const result = await api.postData("/test-post", { name: "ForestOS" });
    assert.equal(result.created, true);
  });

  await test("PATCH sends JSON body", async () => {
    mockFetch = async (url, init) => {
      assert.equal(init.method, "PATCH");
      assert.deepEqual(JSON.parse(init.body), { active: true });
      return jsonResponse({ updated: true });
    };

    const result = await api.patchData("/test-patch", { active: true });
    assert.equal(result.updated, true);
  });

  await test("PUT sends JSON body", async () => {
    mockFetch = async (url, init) => {
      assert.equal(init.method, "PUT");
      assert.deepEqual(JSON.parse(init.body), { value: 42 });
      return jsonResponse({ saved: true });
    };

    const result = await api.putData("/test-put", { value: 42 });
    assert.equal(result.saved, true);
  });

  await test("DELETE sends DELETE method", async () => {
    mockFetch = async (url, init) => {
      assert.equal(init.method, "DELETE");
      return jsonResponse({ deleted: true });
    };

    const result = await api.deleteData("/test-delete");
    assert.equal(result.deleted, true);
  });

  await test("HTTP 401 produces ApiError with status 401", async () => {
    mockFetch = async () => new Response("Unauthorized", { status: 401 });

    await assert.rejects(
      () => api.getData("/test-401"),
      error => error.name === "ApiError" && error.status === 401
    );
  });

  await test("Organisation-context HTTP 400 is recognised", async () => {
    mockFetch = async () =>
      new Response("Missing X-Organization-Id header", { status: 400 });

    await assert.rejects(
      () => api.getData("/test-org"),
      error => error.name === "ApiError" &&
        error.status === 400 &&
        error.message.includes("No organization selected")
    );
  });

  await test("Network failure produces network ApiError", async () => {
    mockFetch = async () => {
      throw new Error("Simulated network outage");
    };

    await assert.rejects(
      () => api.getData("/test-network"),
      error => error.name === "ApiError" &&
        error.status === 0 &&
        error.kind === "network"
    );
  });

  await test("HTTP 204 empty response returns undefined", async () => {
    mockFetch = async () => new Response(null, { status: 204 });

    const result = await api.deleteData("/test-empty");
    assert.equal(result, undefined);
  });

  await test("FormData upload leaves Content-Type boundary to fetch", async () => {
    mockFetch = async (url, init) => {
      assert.equal(init.method, "POST");
      assert(init.body instanceof FormData);
      assert.equal(init.headers["Content-Type"], undefined);
      assert.equal(init.headers.Authorization, "Bearer test-token-193");
      return jsonResponse({ uploaded: true });
    };

    const form = new FormData();
    form.append("description", "runtime-test");

    const result = await api.postFormData("/test-upload", form);
    assert.equal(result.uploaded, true);
  });

  await test("Binary download returns Blob", async () => {
    mockFetch = async (url, init) => {
      assert.equal(init.method, "GET");
      assert.equal(init.headers.Authorization, "Bearer test-token-193");
      return new Response("binary-test-content", {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      });
    };

    const result = await api.getBlob("/test-download");
    assert(result instanceof Blob);
    assert.equal(await result.text(), "binary-test-content");
  });

  console.log("\n========== RUNTIME TEST SUMMARY ==========");
  console.log(`Passed: ${results.filter(x => x.passed).length}`);
  console.log(`Failed: ${results.filter(x => !x.passed).length}`);

  if (results.some(x => !x.passed)) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});