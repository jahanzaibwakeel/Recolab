import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/datasets/csv.js";

describe("MovieLens CSV parser", () => {
  it("handles quoted commas and escaped quotes", () => {
    const rows = parseCsv('movieId,title,genres\n1,"Toy Story, The (1995)",Animation|Children\n2,"A ""quoted"" title",Drama\n');
    expect(rows[0]).toEqual(["movieId", "title", "genres"]);
    expect(rows[1]).toEqual(["1", "Toy Story, The (1995)", "Animation|Children"]);
    expect(rows[2]).toEqual(["2", 'A "quoted" title', "Drama"]);
  });
});

