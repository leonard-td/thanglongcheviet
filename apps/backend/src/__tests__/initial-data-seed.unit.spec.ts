import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

import { getDefaultSeedData } from "../migration-scripts/initial-data-seed";

const fixturePath = path.resolve(__dirname, "../migration-scripts/data/initial-data.json");

describe("initial data seed import/export", () => {
  it("loads the JSON fixture and exposes the expected seed sections", async () => {
    const raw = fs.readFileSync(fixturePath, "utf8");
    const data = JSON.parse(raw);

    expect(data.store).toBeDefined();
    expect(data.region).toBeDefined();
    expect(data.products).toBeDefined();
    expect(data.content).toBeDefined();
    expect(data.content.navigation.menu.slug).toBe("storefront-header");
  });

  it("exports a default seed payload from the script module", async () => {
    const payload = await getDefaultSeedData();
    expect(payload.store).toBeDefined();
    expect(payload.products.categories).toHaveLength(1);
    expect(payload.content.cards.length).toBeGreaterThan(0);
    expect(payload.content.campaign_topics.length).toBeGreaterThan(0);
    expect(payload.content.campaign_posts.length).toBeGreaterThan(0);
    expect(payload.content.navigation.tree.length).toBeGreaterThan(0);
    expect(payload.content.navigation.menu.slug).toBe("storefront-header");
  });
});
