import { createIndustrySlice, IndustrySlice } from '@/store/industrySlice';
import { GameState } from '@/types/GameState';
import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { Recipes } from '../../src/app/definisions/RecipeTypes';
import { createTurnSlice, TurnSlice } from '../../src/app/store/turnSlice';
import { initWorld } from '../../src/app/testing/worldInit';
import { GoodsType, MaterialType, ResourceType } from '../../src/app/types/Resource';
import { Nation } from '../../src/app/types/Nation';

function createStore() {
    const { map, nations } = initWorld({ cols: 5, rows: 5 });
    // Set industry on each nation,
    const warehouse: Record<string, number> = {
        [ResourceType.Coal]: 100,
        [ResourceType.IronOre]: 100,
        [ResourceType.Timber]: 100,
        [ResourceType.Wool]: 100,
    };
    const nationsWithIndustry = nations.map((n: Nation) => ({
        ...n,
        industry: {
            buildings: [],
            workers: { untrained: 10, trained: 10, expert: 10 },
            power: { total: 100, available: 4, electricity: 0 }
        },
        warehouse,
    }));

    const base: Partial<GameState> = {
        activeNationId: 'nation-1',
        nations: nationsWithIndustry,
        map,
    };

    const useStore = create<GameState & TurnSlice & IndustrySlice>()((...a) => ({
        ...base as GameState,
        ...createTurnSlice(...a),
        ...createIndustrySlice(...a),
    }));

    return useStore;
}

describe('IndustrySlice', () => {

    it('wood economy recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;

        // Set up resources for all wood recipes
        warehouse[ResourceType.Timber] = 4; // enough for both lumber and paper
        warehouse[MaterialType.Lumber] = 2; // enough for furniture
        store.getState().nations[0].industry.power.available = 6; // enough for all

        // Run lumber mill (lumber)
        store.getState().processIndustryProduction(nationId, Recipes.LumberMillLumber);
        // Run lumber mill (paper)
        store.getState().processIndustryProduction(nationId, Recipes.LumberMillPaper);
        // Run furniture factory
        store.getState().processIndustryProduction(nationId, Recipes.FurnitureFactory);

        // After running all, check outputs
        expect(warehouse[MaterialType.Lumber]).toBeGreaterThanOrEqual(1); // produced by lumber mill
        expect(warehouse[MaterialType.Paper]).toBeGreaterThanOrEqual(1); // produced by paper mill
        expect(warehouse[GoodsType.Furniture]).toBeGreaterThanOrEqual(1); // produced by furniture factory
        // Check wood and labour have been deducted
        expect(warehouse[ResourceType.Timber]).toBeLessThanOrEqual(0);
        expect(store.getState().nations[0].industry.power.available).toBeLessThanOrEqual(0);
    });

    it('food industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        warehouse[ResourceType.Grain] = 2;
        warehouse[ResourceType.Fruit] = 2;
        warehouse[ResourceType.Fish] = 2;
        store.getState().nations[0].industry.power.available = 3;
        store.getState().processIndustryProduction(nationId, Recipes.FoodProcessing);
        expect(warehouse[MaterialType.CannedFood]).toBeGreaterThanOrEqual(1);
        expect(warehouse[ResourceType.Grain]).toBeLessThanOrEqual(1);
        expect(warehouse[ResourceType.Fruit]).toBeLessThanOrEqual(1);
        expect(warehouse[ResourceType.Fish]).toBeLessThanOrEqual(1);
    });

    it('textile industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        warehouse[ResourceType.Cotton] = 2;
        warehouse[ResourceType.Wool] = 2;
        store.getState().nations[0].industry.power.available = 4;
        store.getState().processIndustryProduction(nationId, Recipes.TextileMillFabric);
        warehouse[MaterialType.Fabric] = 2;
        store.getState().nations[0].industry.power.available = 2;
        store.getState().processIndustryProduction(nationId, Recipes.ClothingFactory);
        expect(warehouse[MaterialType.Fabric]).toBeGreaterThanOrEqual(0);
        expect(warehouse[GoodsType.Clothing]).toBeGreaterThanOrEqual(1);
        expect(store.getState().nations[0].industry.power.available).toBeLessThanOrEqual(0);
    });

    it('metal industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        warehouse[ResourceType.Coal] = 2;
        warehouse[ResourceType.IronOre] = 2;
        warehouse[MaterialType.Steel] = 2;
        store.getState().nations[0].industry.power.available = 6;
        store.getState().processIndustryProduction(nationId, Recipes.SteelMill);
        expect(warehouse[ResourceType.Coal]).toBeLessThanOrEqual(0);
        expect(warehouse[ResourceType.IronOre]).toBeLessThanOrEqual(0);
        expect(warehouse[MaterialType.Steel]).toBeGreaterThanOrEqual(3);
        
        store.getState().processIndustryProduction(nationId, Recipes.Hardware);
        expect(warehouse[MaterialType.Steel]).toBeGreaterThanOrEqual(1);
        expect(warehouse[GoodsType.Hardware]).toBeGreaterThanOrEqual(1);
    });

    it('fuel industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        warehouse[ResourceType.Oil] = 2;
        store.getState().nations[0].industry.power.available = 2;
        store.getState().processIndustryProduction(nationId, Recipes.FuelProcessing);
        expect(warehouse[MaterialType.Fuel]).toBeGreaterThanOrEqual(1);
        expect(warehouse[ResourceType.Oil]).toBeLessThanOrEqual(0);
    });

    it('worker training untrainedned ', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        warehouse[MaterialType.CannedFood] = 1;
        warehouse[GoodsType.Hardware] = 1;
        warehouse[GoodsType.Clothing] = 1;
        warehouse[MaterialType.Paper] = 2;
        store.getState().nations[0].industry.power.available = 0;
        store.getState().nations[0].treasury = 2000;
        store.getState().processIndustryProduction(nationId, Recipes.ProduceUntrainedWorker);
        expect(store.getState().nations[0].industry.workers.trained).toBeGreaterThanOrEqual(0);
        expect(store.getState().nations[0].industry.workers.expert).toBeGreaterThanOrEqual(0);
        expect(store.getState().nations[0].industry.workers.untrained).toBeGreaterThanOrEqual(0);
        expect(store.getState().nations[0].industry.power.available).toBeLessThanOrEqual(1);
        expect(store.getState().nations[0].treasury).toBeLessThanOrEqual(2000);
    });

    it('worker training recipes update state after each production step', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        // Initial resources for all worker training recipes
        store.getState().nations[0].industry.workers.untrained = 1;
        store.getState().nations[0].industry.workers.trained = 0;
        store.getState().nations[0].industry.workers.expert = 0;
        store.getState().nations[0].industry.power.available = 4;
        store.getState().nations[0].treasury = 1100;
        warehouse[MaterialType.Paper] = 3;

        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerUntrainedToTrainedWithLabour);
        expect(store.getState().nations[0].industry.workers.untrained).toBe(0); 
        expect(store.getState().nations[0].industry.workers.trained).toBe(1); 
        expect(store.getState().nations[0].industry.power.available).toBe(5); 
        expect(store.getState().nations[0].treasury).toBe(1000); 
        expect(warehouse[MaterialType.Paper]).toBe(2); 

        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerTrainedToExpertWithLabour);
        expect(store.getState().nations[0].industry.workers.trained).toBe(0); 
        expect(store.getState().nations[0].industry.workers.expert).toBe(1); 
        expect(store.getState().nations[0].industry.power.available).toBe(7); 
        expect(store.getState().nations[0].treasury).toBe(0); 
        expect(warehouse[MaterialType.Paper]).toBe(0); 
    });
});
