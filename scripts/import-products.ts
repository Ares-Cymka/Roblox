import fs from "node:fs";
import path from "node:path";
import { GameType, Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUPPORTED_COLUMNS = ["id", "name", "rarity", "value", "img", "boxes", "stock"] as const;
const REQUIRED_COLUMNS = ["id", "name"] as const;

type CsvRow = Record<string, string>;

interface ImportStats {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

interface CliOptions {
  game: GameType;
  file: string;
}

function parseArgs(argv: string[]): CliOptions {
  let game: string | undefined;
  let file: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--game") {
      game = argv[++i];
    } else if (arg === "--file") {
      file = argv[++i];
    }
  }

  if (!game || !file) {
    throw new Error(
      "Usage: npm run import:products -- --game MM2 --file data/mm2-products.csv"
    );
  }

  if (!Object.values(GameType).includes(game as GameType)) {
    throw new Error(
      `Invalid game "${game}". Expected one of: ${Object.values(GameType).join(", ")}`
    );
  }

  return { game: game as GameType, file };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const rows: CsvRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const values = parseCsvLine(lines[lineIndex]);
    const row: CsvRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    row.__line = String(lineIndex + 1);
    rows.push(row);
  }

  return rows;
}

function parseValue(raw: string | undefined): Prisma.Decimal | null {
  if (!raw?.trim()) return null;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid value "${raw}"`);
  }
  return new Prisma.Decimal(parsed);
}

function parseStock(raw: string | undefined): number {
  if (!raw?.trim()) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error(`Invalid stock "${raw}"`);
  }
  return parsed;
}

function buildMetadata(row: CsvRow): Prisma.InputJsonValue | undefined {
  const metadata: Record<string, Prisma.InputJsonValue> = {};

  if (row.boxes?.trim()) {
    metadata.boxes = row.boxes.trim();
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function validateHeaders(rows: CsvRow[]): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]).filter((key) => key !== "__line");
  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) {
      throw new Error(`Missing required CSV column: ${required}`);
    }
  }

  const unknown = headers.filter(
    (header) => !SUPPORTED_COLUMNS.includes(header as (typeof SUPPORTED_COLUMNS)[number])
  );
  if (unknown.length > 0) {
    console.warn(`Ignoring unsupported columns: ${unknown.join(", ")}`);
  }
}

function rowToProductInput(game: GameType, row: CsvRow) {
  const itemId = row.id?.trim();
  const name = row.name?.trim();

  if (!itemId || !name) {
    return { skip: true as const, reason: "missing id or name" };
  }

  return {
    skip: false as const,
    data: {
      game,
      itemId,
      name,
      rarity: row.rarity?.trim() || null,
      value: parseValue(row.value),
      imageUrl: row.img?.trim() || null,
      stock: parseStock(row.stock),
      metadata: buildMetadata(row),
    },
  };
}

async function importProducts(options: CliOptions): Promise<ImportStats> {
  const filePath = path.resolve(process.cwd(), options.file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const rows = parseCsv(content);
  validateHeaders(rows);

  const stats: ImportStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  console.log(`Importing ${rows.length} rows from ${filePath}`);
  console.log(`Game: ${options.game}`);
  console.log("Catalog only — bot inventory is not modified.\n");

  for (const row of rows) {
    const line = row.__line ?? "?";

    try {
      const mapped = rowToProductInput(options.game, row);

      if (mapped.skip) {
        stats.skipped++;
        console.warn(`Row ${line} skipped: ${mapped.reason}`);
        continue;
      }

      const existing = await prisma.product.findUnique({
        where: {
          game_itemId: {
            game: mapped.data.game,
            itemId: mapped.data.itemId,
          },
        },
        select: { id: true },
      });

      await prisma.product.upsert({
        where: {
          game_itemId: {
            game: mapped.data.game,
            itemId: mapped.data.itemId,
          },
        },
        create: mapped.data,
        update: {
          name: mapped.data.name,
          rarity: mapped.data.rarity,
          value: mapped.data.value,
          imageUrl: mapped.data.imageUrl,
          stock: mapped.data.stock,
          metadata: mapped.data.metadata,
        },
      });

      if (existing) {
        stats.updated++;
      } else {
        stats.created++;
      }
    } catch (error) {
      stats.errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Row ${line} error: ${message}`);
    }
  }

  return stats;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const stats = await importProducts(options);

  console.log("\nImport summary");
  console.log(`Created: ${stats.created}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors:  ${stats.errors}`);

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
