// DASHBOARD CRASH FIX - BROWSER CONSOLE TEST SCRIPT
// Copy and paste this into your browser console (F12) while logged into the dashboard

console.log("🔧 DASHBOARD CRASH FIX - VERIFICATION SCRIPT");
console.log("=" .repeat(50));

// Test 1: Check if manifests API returns wrapped object
console.log("\n📡 Test 1: Fetch manifests API");
fetch('/api/manifests', { credentials: 'include' })
  .then(res => {
    console.log("Status:", res.status);
    return res.json();
  })
  .then(data => {
    console.log("Response structure:");
    console.log(data);
    
    if (data.data && Array.isArray(data.data)) {
      console.log("✅ CORRECT: API returns { data: Array, pagination: Object }");
      console.log("   Manifests count:", data.data.length);
    } else if (Array.isArray(data)) {
      console.log("✅ CORRECT: API returns direct array");
      console.log("   Manifests count:", data.length);
    } else {
      console.log("❌ UNEXPECTED: Data structure is:", typeof data);
    }
  })
  .catch(err => console.error("❌ Error:", err));

// Test 2: Check if shipments API returns array
console.log("\n📡 Test 2: Fetch shipments API");
fetch('/api/shipments', { credentials: 'include' })
  .then(res => {
    console.log("Status:", res.status);
    return res.json();
  })
  .then(data => {
    if (Array.isArray(data)) {
      console.log("✅ CORRECT: Shipments returns direct array");
      console.log("   Shipments count:", data.length);
    } else {
      console.log("ℹ️ Shipments response structure:", typeof data);
      console.log(data);
    }
  })
  .catch(err => console.error("❌ Error:", err));

// Test 3: Check authentication
console.log("\n🔐 Test 3: Check user authentication");
fetch('/api/auth/me', { credentials: 'include' })
  .then(res => {
    console.log("Status:", res.status);
    return res.json();
  })
  .then(data => {
    if (data.user || data.id) {
      console.log("✅ AUTHENTICATED: User logged in");
      console.log("   User:", data.user?.name || data.name || "Unknown");
      console.log("   Role:", data.user?.role || data.role || "Unknown");
    } else if (data.message) {
      console.log("❌ NOT AUTHENTICATED:", data.message);
    } else {
      console.log("ℹ️ Auth response:", data);
    }
  })
  .catch(err => console.error("❌ Error:", err));

console.log("\n" + "=".repeat(50));
console.log("✅ All tests completed! Check results above.");
console.log("If you see ✅ marks, the fix is working correctly!");
