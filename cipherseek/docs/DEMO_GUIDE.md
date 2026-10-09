# Judge Demo Guide (2-3 Minutes)

This script will reliably demonstrate the required features.

1. **Start the App:** Open `http://localhost:5173`.
2. **Overview:** Point out that no keys exist. Click "Generate Session Keys".
3. **Vault:** Go to the Document Vault. Click "Load Demo Workspace". This encrypts and uploads 10 sample contracts securely in the browser.
4. **Search:** Go to Private Search.
   - Search for `vendor` (Exact).
   - Search for `vendor payment` (AND).
   - Note the green "Results Verified Successfully!" box.
5. **Attack Simulation:** Go to the Verification Center.
   - Select "A. Omit a matching document ID".
   - Switch back to Private Search.
   - Run the search for `vendor` again.
   - Observe the red "Verification Failed!" box. The client detected the server omitting a result.
6. **Audit Console:** Open Privacy Audit.
   - Show "What the Server CANNOT See" vs "What the Server CAN See".
   - Look at the live logs to show that only opaque HMAC tokens and UUIDs reach the server.
7. **Reset:** Go to Verification Center, set Attack to "Normal". Go to Overview and click "Reset Demo Server State".
