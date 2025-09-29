import { createIndustrySlice, IndustrySlice } from '@/store/industrySlice';
import { GameState } from '@/types/GameState';
import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { Recipes } from '../../src/app/definisions/RecipeTypes';
import { createTurnSlice, TurnSlice } from '../../src/app/store/turnSlice';
import { initWorld } from '../../src/app/testing/worldInit';
import { ResourceType } from '../../src/app/types/Resource';
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
        warehouse['lumber'] = 2; // enough for furniture
        store.getState().nations[0].industry.power.available = 6; // enough for all

        // Run lumber mill (lumber)
        store.getState().processIndustryProduction(nationId, Recipes.LumberMillLumber);
        // Run lumber mill (paper)
        store.getState().processIndustryProduction(nationId, Recipes.LumberMillPaper);
        // Run furniture factory
        store.getState().processIndustryProduction(nationId, Recipes.FurnitureFactory);

        // After running all, check outputs
        expect(warehouse['lumber']).toBeGreaterThanOrEqual(1); // produced by lumber mill
        expect(warehouse['paper']).toBeGreaterThanOrEqual(1); // produced by paper mill
        expect(warehouse['furniture']).toBeGreaterThanOrEqual(1); // produced by furniture factory
        // Check wood and labour have been deducted
        expect(warehouse[ResourceType.Timber]).toBeLessThanOrEqual(0);
        expect(store.getState().nations[0].industry.power.available).toBeLessThanOrEqual(0);
    });

    it('food industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        warehouse['grain'] = 2;
        warehouse['fruit'] = 2;
        warehouse['fish'] = 2;
        store.getState().nations[0].industry.power.available = 3;
        store.getState().processIndustryProduction(nationId, Recipes.FoodProcessing);
        expect(warehouse['cannedFood']).toBeGreaterThanOrEqual(1);
        expect(warehouse['grain']).toBeLessThanOrEqual(1);
        expect(warehouse['fruit']).toBeLessThanOrEqual(1);
        expect(warehouse['fish']).toBeLessThanOrEqual(1);
        expect(store.getState().nations[0].industry.power.available).toBeLessThanOrEqual(0);
    });

    it('textile industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        warehouse['cotton'] = 2;
        warehouse['wool'] = 2;
        store.getState().nations[0].industry.power.available = 4;
        store.getState().processIndustryProduction(nationId, Recipes.TextileMillFabric);
        warehouse['fabric'] = 2;
        store.getState().nations[0].industry.power.available = 2;
        store.getState().processIndustryProduction(nationId, Recipes.ClothingFactory);
        expect(warehouse['fabric']).toBeGreaterThanOrEqual(0);
        expect(warehouse['clothing']).toBeGreaterThanOrEqual(1);
        expect(store.getState().nations[0].industry.power.available).toBeLessThanOrEqual(0);
    });

    it('metal industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        warehouse['coal'] = 2;
        warehouse['ironOre'] = 2;
        warehouse['steel'] = 2;
        store.getState().nations[0].industry.power.available = 6;
        store.getState().processIndustryProduction(nationId, Recipes.SteelMill);
        store.getState().processIndustryProduction(nationId, Recipes.Hardware);
        expect(warehouse['steel']).toBeGreaterThanOrEqual(1);
        expect(warehouse['hardware']).toBeGreaterThanOrEqual(1);
        expect(warehouse['coal']).toBeLessThanOrEqual(0);
        expect(warehouse['ironOre']).toBeLessThanOrEqual(0);
        expect(store.getState().nations[0].industry.power.available).toBeLessThanOrEqual(0);
    });

    it('fuel industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        warehouse['oil'] = 2;
        store.getState().nations[0].industry.power.available = 2;
        store.getState().processIndustryProduction(nationId, Recipes.FuelProcessing);
        expect(warehouse['fuel']).toBeGreaterThanOrEqual(1);
        expect(warehouse['oil']).toBeLessThanOrEqual(0);
        expect(store.getState().nations[0].industry.power.available).toBeLessThanOrEqual(0);
    });

    it('worker training and production recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
            store.getState().nations[0].industry.workers.untrained = 2;
            store.getState().nations[0].industry.workers.trained = 2;
           warehouse['cannedFood'] = 1;
           warehouse['hardware'] = 1;
           warehouse['clothing'] = 1;
           warehouse['paper'] = 2;
            store.getState().nations[0].industry.power.available = 6;
           store.getState().nations[0].treasury = 2000;
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerUntrainedToTrained);
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerTrainedToExpert);
        store.getState().processIndustryProduction(nationId, Recipes.ProduceUntrainedWorker);
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerUntrainedToTrainedWithLabour);
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerTrainedToExpertWithLabour);
            expect(store.getState().nations[0].industry.workers.trained).toBeGreaterThanOrEqual(1);
            expect(store.getState().nations[0].industry.workers.expert).toBeGreaterThanOrEqual(1);
            expect(store.getState().nations[0].industry.workers.untrained).toBeGreaterThanOrEqual(0);
            expect(store.getState().nations[0].industry.power.available).toBeLessThanOrEqual(0);
           expect(store.getState().nations[0].treasury).toBeLessThanOrEqual(2000);
    });

    it('worker training recipes update state after each production step', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const warehouse = store.getState().nations[0].warehouse;
        // Initial resources for all worker training recipes
            store.getState().nations[0].industry.workers.untrained = 3;
            store.getState().nations[0].industry.workers.trained = 2;
            store.getState().nations[0].industry.workers.expert = 0;
            store.getState().nations[0].industry.power.available = 10;
            store.getState().nations[0].treasury = 2000;
        warehouse['paper'] = 3;
        // Step 1: Train untrained to trained (cash)
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerUntrainedToTrained);
            expect(store.getState().nations[0].industry.workers.untrained).toBe(1); // 2 used
            expect(store.getState().nations[0].industry.workers.trained).toBe(3); // +1
            expect(store.getState().nations[0].industry.power.available).toBe(8); // -2
            expect(store.getState().nations[0].treasury).toBe(1500); // -500
        // Step 2: Train trained to expert (cash)
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerTrainedToExpert);
            expect(store.getState().nations[0].industry.workers.trained).toBe(1); // 2 used
            expect(store.getState().nations[0].industry.workers.expert).toBe(1); // +1
            expect(store.getState().nations[0].industry.power.available).toBe(6); // -2
            expect(store.getState().nations[0].treasury).toBe(500); // -1000
        // Step 3: Train untrained to trained (labour, paper, cash)
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerUntrainedToTrainedWithLabour);
            expect(store.getState().nations[0].industry.workers.untrained).toBe(0); // 1 used
            expect(store.getState().nations[0].industry.workers.trained).toBe(2); // +1
            expect(store.getState().nations[0].industry.power.available).toBe(7); // +1
            expect(store.getState().nations[0].treasury).toBe(400); // -100
        expect(warehouse['paper']).toBe(2); // -1
        // Step 4: Train trained to expert (labour, paper, cash)
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerTrainedToExpertWithLabour);
            expect(store.getState().nations[0].industry.workers.trained).toBe(1); // 1 used
            expect(store.getState().nations[0].industry.workers.expert).toBe(2); // +1
            expect(store.getState().nations[0].industry.power.available).toBe(9); // +2
            expect(store.getState().nations[0].treasury).toBe(-600); // -1000
        expect(warehouse['paper']).toBe(0); // -2
    });
});
