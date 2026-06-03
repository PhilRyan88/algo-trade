import { Project } from "ts-morph";
import * as path from "path";
import * as fs from "fs";

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const srcDir = project.getDirectory("src");
if (!srcDir) throw new Error("src dir not found");

// Create directories
const dirsToCreate = [
    "app/plugins",
    "config",
    "shared/logger", "shared/events", "shared/types", "shared/utils",
    "market/websocket", "market/marketData", "market/indicators", "market/candles",
    "strategy/strategies/breakout", "strategy/strategies/scalping", "strategy/strategies/trendFollowing",
    "execution",
    "portfolio",
    "paperTrading",
    "backtesting/reports",
    "realtime",
    "api/routes", "api/controllers", "api/schemas",
    "database/repositories", "database/models"
];

for (const d of dirsToCreate) {
    const dirPath = path.join(__dirname, "src", d);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function moveFile(oldPath: string, newPath: string) {
    const file = project.getSourceFile(oldPath);
    if (file) {
        console.log(`Moving ${oldPath} to ${newPath}`);
        file.move(path.join(__dirname, newPath));
    } else {
        console.log(`File not found: ${oldPath}`);
    }
}

// 1. app/
moveFile("src/app.ts", "src/app/fastify.ts");
moveFile("src/server.ts", "src/app/server.ts");

// 3. shared/
moveFile("src/utils/crypto.ts", "src/shared/utils/crypto.ts");
moveFile("src/services/strategy/tradeLogger.ts", "src/shared/logger/tradeLogger.ts");

// 4. market/
moveFile("src/services/angelOneService.ts", "src/market/marketData/angelOneService.ts");
moveFile("src/services/nseService.ts", "src/market/marketData/nseService.ts");
moveFile("src/services/strategy/indicatorEngine.ts", "src/market/indicators/indicatorEngine.ts");
moveFile("src/services/featureExtractor.ts", "src/market/candles/featureExtractor.ts");

// 5. strategy/
moveFile("src/services/strategy/signalEngine.ts", "src/strategy/signalEngine.ts");
moveFile("src/services/strategy/scoringEngine.ts", "src/strategy/scoringEngine.ts");
moveFile("src/services/strategyEngine.ts", "src/strategy/strategyManager.ts");
moveFile("src/services/mlService.ts", "src/strategy/mlService.ts");

// 6. execution/
moveFile("src/services/strategy/orderExecutor.ts", "src/execution/orderExecutor.ts");

// 7. portfolio/
moveFile("src/services/strategy/positionManager.ts", "src/portfolio/positionManager.ts");
moveFile("src/services/strategy/riskManager.ts", "src/portfolio/riskManager.ts");

// 9. backtesting/
moveFile("src/services/backtestService.ts", "src/backtesting/backtestEngine.ts");

// 11. api/
// Controllers
moveFile("src/controllers/breakoutController.ts", "src/api/controllers/breakoutController.ts");
moveFile("src/services/analysisService.ts", "src/shared/utils/analysisService.ts");
moveFile("src/services/settingsService.ts", "src/api/controllers/settingsService.ts");

// Routes
moveFile("src/routes/authRoutes.ts", "src/api/routes/authRoutes.ts");
moveFile("src/routes/breakoutRoutes.ts", "src/api/routes/breakoutRoutes.ts");
moveFile("src/routes/dividendRoutes.ts", "src/api/routes/dividendRoutes.ts");
moveFile("src/routes/marketRoutes.ts", "src/api/routes/marketRoutes.ts");
moveFile("src/routes/optionsRoutes.ts", "src/api/routes/optionsRoutes.ts");
moveFile("src/routes/tradeRoutes.ts", "src/api/routes/tradeRoutes.ts");

// 12. database/
moveFile("src/models/AngelOneSession.ts", "src/database/models/AngelOneSession.ts");
moveFile("src/models/Breakout.ts", "src/database/models/Breakout.ts");
moveFile("src/models/PaperTrade.ts", "src/database/models/PaperTrade.ts");
moveFile("src/models/Setting.ts", "src/database/models/Setting.ts");
moveFile("src/models/StrategyLog.ts", "src/database/models/StrategyLog.ts");
moveFile("src/models/User.ts", "src/database/models/User.ts");

console.log("Saving project...");
project.saveSync();
console.log("Save complete!");
