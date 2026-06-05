import { Router } from "express";
import { getItem, listItems } from "../services/repository.js";
import { similarItems } from "../services/recommendationService.js";
import { parseCatalogSearchParams, searchCatalog } from "../services/catalogSearchService.js";

export const itemsRouter = Router();

itemsRouter.get("/", async (req, res, next) => {
  try {
    if (Object.keys(req.query).length > 0) {
      res.json(await searchCatalog(parseCatalogSearchParams(req.query)));
      return;
    }
    res.json(await listItems());
  } catch (error) {
    next(error);
  }
});

itemsRouter.get("/:id/similar", async (req, res, next) => {
  try {
    res.json(await similarItems(req.params.id, Number(req.query.k ?? 6)));
  } catch (error) {
    next(error);
  }
});

itemsRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await getItem(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (error) {
    next(error);
  }
});
