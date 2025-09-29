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
        [ResourceType.Cotton]: 100,
    };
    const nationsWithIndustry = nations.map((n: Nation) => ({
        ...n,
        industry: {
            buildings: [],
            workers: { untrained: 10, trained: 10, expert: 10 },
            power: { total: 100, available: 4, electricity: 0 }
        },
        warehouse,
        treasury: 10000,
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
        const nation = store.getState().nations[0];
        const warehouse = nation.warehouse;

        // Set up resources for all wood recipes
        warehouse[ResourceType.Timber] = 4;
        warehouse['lumber'] = 2;
        nation.industry.power.available = 6;

        store.getState().processIndustryProduction(nationId, Recipes.LumberMillLumber);
        store.getState().processIndustryProduction(nationId, Recipes.LumberMillPaper);
        store.getState().processIndustryProduction(nationId, Recipes.FurnitureFactory);

        const finalNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(finalNation.warehouse['lumber']).toBe(1);
        expect(finalNation.warehouse['paper']).toBe(1);
        expect(finalNation.warehouse['furniture']).toBe(1);
        expect(finalNation.warehouse[ResourceType.Timber]).toBe(0);
        expect(finalNation.industry.power.available).toBe(0);
    });

    it('food industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const nation = store.getState().nations[0];
        const warehouse = nation.warehouse;
        warehouse['grain'] = 2;
        warehouse['fruit'] = 2;
        warehouse['fish'] = 2;
        nation.industry.power.available = 2;
        store.getState().processIndustryProduction(nationId, Recipes.FoodProcessing);
        const finalNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(finalNation.warehouse['cannedFood']).toBe(1);
        expect(finalNation.warehouse['grain']).toBe(1);
        expect(finalNation.warehouse['fruit']).toBe(1);
        expect(finalNation.warehouse['fish']).toBe(1);
        expect(finalNation.industry.power.available).toBe(0);
    });

    it('textile industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const nation = store.getState().nations[0];
        nation.warehouse['cotton'] = 2;
        nation.warehouse['wool'] = 2;
        nation.industry.power.available = 4;

        store.getState().processIndustryProduction(nationId, Recipes.TextileMillFabric);

        const stateAfterFabric = store.getState();
        const nationAfterFabric = stateAfterFabric.nations.find(n => n.id === nationId)!;
        nationAfterFabric.warehouse['fabric'] = 2; // Add fabric for next step
        nationAfterFabric.industry.power.available = 2;

        store.setState(stateAfterFabric)
        store.getState().processIndustryProduction(nationId, Recipes.ClothingFactory);

        const finalNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(finalNation.warehouse['fabric']).toBe(0);
        expect(finalNation.warehouse['clothing']).toBe(1);
        expect(finalNation.industry.power.available).toBe(0);
    });

    it('metal industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const nation = store.getState().nations[0];
        // Setup for SteelMill
        nation.warehouse['coal'] = 4;
        nation.warehouse['ironOre'] = 4;
        nation.industry.power.available = 6; // 2 for each steel, 2 for hardware

        // Run SteelMill twice to get enough steel
        store.getState().processIndustryProduction(nationId, Recipes.SteelMill);
        store.getState().processIndustryProduction(nationId, Recipes.SteelMill);

        // Run Hardware factory
        store.getState().processIndustryProduction(nationId, Recipes.Hardware);

        const finalNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(finalNation.warehouse['steel']).toBe(0);
        expect(finalNation.warehouse['hardware']).toBe(1);
        expect(finalNation.warehouse['coal']).toBe(0);
        expect(finalNation.warehouse['ironOre']).toBe(0);
        expect(finalNation.industry.power.available).toBe(0);
    });

    it('fuel industry recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const nation = store.getState().nations[0];
        nation.warehouse['oil'] = 2;
        nation.industry.power.available = 2;
        store.getState().processIndustryProduction(nationId, Recipes.FuelProcessing);
        const finalNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(finalNation.warehouse['fuel']).toBe(1);
        expect(finalNation.warehouse['oil']).toBe(0);
        expect(finalNation.industry.power.available).toBe(0);
    });

    it('worker training and production recipes calculate outputs correctly', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const nation = store.getState().nations[0];
        nation.industry.workers.untrained = 3;
        nation.industry.workers.trained = 3;
        nation.industry.workers.expert = 0;
        nation.warehouse['cannedFood'] = 1;
        nation.warehouse['hardware'] = 1;
        nation.warehouse['clothing'] = 1;
        nation.warehouse['paper'] = 3;
        nation.industry.power.available = 7;
        nation.treasury = 2600;

        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerUntrainedToTrained);
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerTrainedToExpert);
        store.getState().processIndustryProduction(nationId, Recipes.ProduceUntrainedWorker);
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerUntrainedToTrainedWithLabour);
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerTrainedToExpertWithLabour);

        const finalNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(finalNation.industry.workers.trained).toBe(2);
        expect(finalNation.industry.workers.expert).toBe(2);
        expect(finalNation.industry.workers.untrained).toBe(1);
        expect(finalNation.industry.power.available).toBe(7);
        expect(finalNation.treasury).toBe(0);
    });

    it('worker training recipes update state after each production step', () => {
        const store = createStore();
        const nationId = store.getState().activeNationId;
        const nation = store.getState().nations[0];

        nation.industry.workers.untrained = 3;
        nation.industry.workers.trained = 2;
        nation.industry.workers.expert = 0;
        nation.industry.power.available = 10;
        nation.treasury = 2600;
        nation.warehouse['paper'] = 3;

        // Step 1: Train untrained to trained (cash)
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerUntrainedToTrained);
        let currentNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(currentNation.industry.workers.untrained).toBe(1);
        expect(currentNation.industry.workers.trained).toBe(3);
        expect(currentNation.industry.power.available).toBe(8);
        expect(currentNation.treasury).toBe(2100);

        // Step 2: Train trained to expert (cash)
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerTrainedToExpert);
        currentNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(currentNation.industry.workers.trained).toBe(1);
        expect(currentNation.industry.workers.expert).toBe(1);
        expect(currentNation.industry.power.available).toBe(6);
        expect(currentNation.treasury).toBe(1100);

        // Step 3: Train untrained to trained (labour, paper, cash)
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerUntrainedToTrainedWithLabour);
        currentNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(currentNation.industry.workers.untrained).toBe(0);
        expect(currentNation.industry.workers.trained).toBe(2);
        expect(currentNation.industry.power.available).toBe(7);
        expect(currentNation.treasury).toBe(1000);
        expect(currentNation.warehouse['paper']).toBe(2);

        // Step 4: Train trained to expert (labour, paper, cash)
        store.getState().processIndustryProduction(nationId, Recipes.TrainWorkerTrainedToExpertWithLabour);
        currentNation = store.getState().nations.find(n => n.id === nationId)!;
        expect(currentNation.industry.workers.trained).toBe(1);
        expect(currentNation.industry.workers.expert).toBe(2);
        expect(currentNation.industry.power.available).toBe(9);
        expect(currentNation.treasury).toBe(0);
        expect(currentNation.warehouse['paper']).toBe(0);
    });
});