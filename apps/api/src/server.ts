import { app } from "./app.js";
import { config } from "./config.js";
import { seed } from "./db/seed.js";
import { startObservabilitySnapshotLoop } from "./services/observabilityHistoryService.js";

await seed();
startObservabilitySnapshotLoop();

app.listen(config.port, () => {
  console.log(`RecoLab API running on http://localhost:${config.port}`);
});
