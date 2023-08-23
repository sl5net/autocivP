
autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.autociv_FindEntitiesWithClassesExpression = function (player, data)
{
    const evalExpression = this.autociv_getExpressionEvaluator(data.classesExpression);
    if (!evalExpression)
        return [];

    let rangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let entities = data.list || rangeManager.GetEntitiesByPlayer(player);

    return entities.filter(e =>
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            evalExpression(cmpIdentity.GetClassesList());
    });
};

/**
 * Opimitzed stats function for autociv stats overlay
 */
GuiInterface.prototype.autociv_GetStatsOverlay = function ()
{
    const ret = {
        "players": []
    };

    const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    const numPlayers = cmpPlayerManager.GetNumPlayers();
    for (let player = 0; player < numPlayers; ++player)
    {
        const playerEnt = cmpPlayerManager.GetPlayerByID(player);
        const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
   		const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);

        // Work out which phase we are in.
        let phase = 0;
		const cmpTechnologyManager = Engine.QueryInterface(playerEnt, IID_TechnologyManager);
        if (cmpTechnologyManager)
        {
            if (cmpTechnologyManager.IsTechnologyResearched("phase_city"))
                phase = 3;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_town"))
                phase = 2;
            else if (cmpTechnologyManager.IsTechnologyResearched("phase_village"))
                phase = 1;
        }

        const cmpPlayerStatisticsTracker = QueryPlayerIDInterface(player, IID_StatisticsTracker);
        const classCounts = cmpTechnologyManager?.GetClassCounts()

        ret.players.push({
            "name": cmpIdentity.GetName(),
            "popCount": cmpPlayer.GetPopulationCount(),
            "resourceCounts": cmpPlayer.GetResourceCounts(),
            "state": cmpPlayer.GetState(),
            "team": cmpPlayer.GetTeam(),
            "hasSharedLos": cmpPlayer.HasSharedLos(),
            "phase": phase,
            "researchedTechsCount": cmpTechnologyManager?.GetResearchedTechs().size ?? 0,
            "classCounts_Support": classCounts?.Support ?? 0,
            "classCounts_Infantry": classCounts?.Infantry ?? 0,
            "classCounts_Cavalry": classCounts?.Cavalry ?? 0,
            "classCounts_Siege": (classCounts?.Siege ?? 0),
            "classCounts_Champion": (classCounts?.Champion ?? 0),
            "enemyUnitsKilledTotal": cmpPlayerStatisticsTracker?.enemyUnitsKilled.total ?? 0
        });
    }

    return ret;
};

GuiInterface.prototype.autociv_setHealersInitialStanceAggressive = function (player, active)
{
    this.autociv.setHealersInitialStanceAggressive = active
}

// Original variable declaration is prefixed with let instead of var so we can't
// just add new entries directly (global let declaration rules)
var autociv_exposedFunctions = {
    "autociv_FindEntitiesWithTemplateName": 1,
    "autociv_FindEntitiesWithGenericName": 1,
    "autociv_FindEntitiesWithClasses": 1,
    "autociv_FindEntitiesWithClassesExpression": 1,
    "autociv_SetCorpsesMax": 1,
    "autociv_GetStatsOverlay": 1,
    "autociv_setHealersInitialStanceAggressive": 1
};

autociv_patchApplyN(GuiInterface.prototype, "ScriptCall", function (target, that, args)
{
    let [player, name, vargs] = args;
    if (name in autociv_exposedFunctions)
        return that[name](player, vargs);

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_GuiInterface, "GuiInterface", GuiInterface);
Health.prototype.CreateCorpse = function()
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed.
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition || !cmpPosition.IsInWorld())
		return;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let templateName = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager).GetCurrentTemplateName(this.entity);

	let entCorpse;
	let cmpResourceSupply = Engine.QueryInterface(this.entity, IID_ResourceSupply);
	let resource = cmpResourceSupply && cmpResourceSupply.GetKillBeforeGather();
	if (resource)
		entCorpse = Engine.AddEntity("resource|" + templateName);
    else
    {
        entCorpse = Engine.AddLocalEntity("corpse|" + templateName);
        // START: ADDED THIS **************************************************
        // ****************** **************************************************
        const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
        cmpGUIInterface.autociv_CorpseAdd(entCorpse);
        // END: ADDED THIS ****************************************************
        // *********************************************************************
    }

	// Copy various parameters so it looks just like us.
	let cmpPositionCorpse = Engine.QueryInterface(entCorpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpPositionCorpse.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpPositionCorpse.SetYRotation(rot.y);
	cmpPositionCorpse.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpOwnershipCorpse = Engine.QueryInterface(entCorpse, IID_Ownership);
	if (cmpOwnership && cmpOwnershipCorpse)
		cmpOwnershipCorpse.SetOwner(cmpOwnership.GetOwner());

	let cmpVisualCorpse = Engine.QueryInterface(entCorpse, IID_Visual);
	if (cmpVisualCorpse)
	{
		let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
		if (cmpVisual)
			cmpVisualCorpse.SetActorSeed(cmpVisual.GetActorSeed());

		cmpVisualCorpse.SelectAnimation("death", true, 1);
	}

	if (resource)
		Engine.PostMessage(this.entity, MT_EntityRenamed, {
			"entity": this.entity,
			"newentity": entCorpse
		});
};
if (!Visibility.prototype.OnDestroy)
    Visibility.prototype.OnDestroy = function () { };

autociv_patchApplyN(Visibility.prototype, "OnDestroy", function (target, that, args)
{
    let cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    cmpGUIInterface.autociv.corpse.entities.delete(that.entity);
    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_Visibility, "Visibility", Visibility);

autociv_patchApplyN(AIProxy.prototype, "OnTrainingFinished", function (target, that, args)
{
    const [msg] = args

    const cmpGUIInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
    if (cmpGUIInterface.autociv.setHealersInitialStanceAggressive)
    {
        const healerEntities = msg.entities.filter(ent =>
        {
            const cmpIdentity = Engine.QueryInterface(ent, IID_Identity)
            return cmpIdentity?.HasClass("Healer")
        })

        if (healerEntities.length != 0)
            cmpGUIInterface.PushNotification({
                "type": "autociv_setHealersInitialStanceAggressive",
                "entities": msg.entities,
                "players": [msg.owner]
            });
    }

    return target.apply(that, args);
})

Engine.ReRegisterComponentType(IID_AIProxy, "AIProxy", AIProxy);
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        const error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

Engine.RegisterGlobal("autociv_patchApplyN",autociv_patchApplyN)
if (!GuiInterface.prototype.Init)
    GuiInterface.prototype.Init = function () { };


autociv_patchApplyN(GuiInterface.prototype, "Init", function (target, that, args)
{
    that.autociv = {
        corpse: {
            "entities": new Set(),
            "max": Infinity
        },
        setHealersInitialStanceAggressive: true,
    };
    return target.apply(that, args);
})

GuiInterface.prototype.autociv_CorpseUpdate = function ()
{
    for (let entity of this.autociv.corpse.entities)
    {
        if (this.autociv.corpse.entities.size <= this.autociv.corpse.max)
            break;
        this.autociv.corpse.entities.delete(entity);
        Engine.DestroyEntity(entity)
    }
}

GuiInterface.prototype.autociv_CorpseAdd = function (entity)
{
    if (!entity ||
        entity == INVALID_ENTITY ||
        this.autociv.corpse.max == Infinity)
        return;

    this.autociv.corpse.entities.add(entity);
    this.autociv_CorpseUpdate();
}

GuiInterface.prototype.autociv_SetCorpsesMax = function (player, max = 200)
{
    let value = +max;
    if (value >= 200)
    {
        this.autociv.corpse.entities.clear();
        this.autociv.corpse.max = Infinity;
        return;
    }

    value = parseInt(value);
    if (!Number.isInteger(value) || value < 0)
    {
        warn("Invalid max corpses value " + max);
        return;
    }

    this.autociv.corpse.max = value;
    this.autociv_CorpseUpdate();
};

GuiInterface.prototype.autociv_FindEntitiesWithTemplateName = function (player, templateName)
{
    const rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    const cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpTemplateManager.GetCurrentTemplateName(e).endsWith(templateName);
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithGenericName = function (player, genericName)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            cmpIdentity.GetGenericName() == genericName;
    });
};

GuiInterface.prototype.autociv_FindEntitiesWithClasses = function (player, classesList)
{
    let rangeMan = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
    let includesAll = list => classesList.every(v => list.indexOf(v) != -1);

    return rangeMan.GetEntitiesByPlayer(player).filter(function (e)
    {
        let cmpIdentity = Engine.QueryInterface(e, IID_Identity);
        let cmpUnitAI = Engine.QueryInterface(e, IID_UnitAI);
        let cmpFoundation = Engine.QueryInterface(e, IID_Foundation);
        let cmpMirage = Engine.QueryInterface(e, IID_Mirage);
        return cmpIdentity &&
            !cmpFoundation &&
            !cmpMirage &&
            (cmpUnitAI ? !cmpUnitAI.isGarrisoned : true) &&
            includesAll(cmpIdentity.GetClassesList());
    });
};

/**
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
GuiInterface.prototype.autociv_getExpressionEvaluator = function (expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([]);
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`);
        return;
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`);
        return;
    }

    return list => !!Function("return " + genExpression(list))();
};

/**
 * @param {Object} data
 * @param {String} settings.classesExpression
 * @param {Number[]} [settings.list] Initial list of entities to search from
 */
GuiInterface.prototype.auto
class Autociv_CLI
{
	GUI = {}
	functionParameterCandidates = {}
	initiated = false
	suggestionsMaxVisibleSize = 350
	inspectorMaxVisibleSize = 350
	stdOutMaxVisibleSize = 250
	vlineSize = 19.2
	spacing = " ".repeat(8)
	list_data = []
	prefix = ""
	showDepth = 2
	previewLength = 100
	searchFilter = ""
	seeOwnPropertyNames = false
	lastVariableNameExpressionInspector = ""
	placeholder_text = `prefix: ?=reset u?=undef b?=bool n?=number i?=int s?=string f?=func l?=null a?=array o?=obj p?=see proto ; suffix: >=stdout`

	functionAutocomplete = new Map([
		[Engine?.GetGUIObjectByName, "guiObjectNames"],
		[global?.GetTemplateData, "templateNames"],
		[Engine?.GetTemplate, "templateNames"],
		[Engine?.TemplateExists, "templateNames"],
	])

	functionParameterCandidatesLoader = {
		"guiObjectNames": () =>
		{
			const list = []
			let internal = 0

			let traverse = parent => parent.children.forEach(child =>
			{
				if (child.name.startsWith("__internal("))
					++internal
				else
					list.push(child.name)
				traverse(child)
			})

			while (true)
			{
				let object = Engine.GetGUIObjectByName(`__internal(${internal})`)
				if (!object)
					break

				// Go to root
				while (object.parent != null)
					object = object.parent

				traverse(object)
				++internal
			}
			return list
		},
		"templateNames": () =>
		{
			const prefix = "simulation/templates/"
			const suffix = ".xml"
			return Engine.ListDirectoryFiles(prefix, "*" + suffix, true).
				map(t => t.slice(prefix.length, -suffix.length))
		}
	}

	searchFilterKeys = {
		"u": "undefined",
		"b": "boolean",
		"n": "number",
		"i": "bigint",
		"s": "string",
		"f": "function",
		"l": "null",
		"a": "array",
		"o": "object"
	}

	style = {
		"GUI": {
			"input": {
				"sprite": "color:90 90 90",
				"textcolor": "245 245 245",
				"textcolor_selected": "255 255 255",
				"placeholder_color": "170 170 170",
				"sprite_selectarea": "color:69 200 161",
				"tooltip": "Press Enter to eval expression"
			},
			"stdout": {
				"sprite": "color:60 60 60",
				"textcolor": "245 245 245",
				"textcolor_selected": "255 255 255",
				"sprite_selectarea": "color:69 200 161"
			},
			"suggestions": {
				"sprite": "color:10 10 10",
				"textcolor": "220 220 220",
			},
			"inspector": {
				"sprite": "color:45 45 45",
				"textcolor": "230 230 230",
			},
			"sortMode": {
				"sprite": "color:70 70 70",
				"textcolor": "255 255 255",
				"text_align": "center",
				"text_valign": "center",
				"buffer_zone": 0
			}
		},
		"typeTag": "128 81 102",
		"classTag": "180 120 40",
		"type": {
			"array": "167 91 46",
			"object": "193 152 43",
			"string": "206 145 120",
			"bigint": "127 179 71",
			"number": "127 179 71",
			"boolean": "78 201 176",
			"undefined": "128 41 131",
			"symbol": "218 162 0",
			"function": "78 118 163",
			"null": "12 234 0",
			"default": "86 156 214",
			"Set": "86 156 214",
			"Map": "86 156 214",
		},
		"font": "sans-bold-14",
	}

	constructor(gui)
	{

		this.GUI.gui = gui
		this.GUI.input = this.GUI.gui.children[0]
		this.GUI.stdout = this.GUI.gui.children[1]
		this.GUI.hotkey = this.GUI.gui.children[2]
		this.GUI.suggestions = this.GUI.input.children[0]
		this.GUI.sortMode = this.GUI.input.children[1]
		this.GUI.inspector = this.GUI.suggestions.children[0]

		for (let name in this.style.GUI)
		{
			for (let property in this.style.GUI[name])
				this.GUI[name][property] = this.style.GUI[name][property]
			this.GUI[name].font = this.style.font
		}

		Engine.SetGlobalHotkey("autociv.CLI.toggle", "Press", () => this.toggle())

		this.GUI.input.placeholder_text = this.placeholder_text
		this.GUI.input.onTextEdit = () => this.updateSuggestions()
		this.GUI.input.onTab = () => this.tab()
		this.GUI.input.onPress = () => this.evalInput()
		this.GUI.stdout.onPress = () => this.stdoutToggle()
		this.GUI.hotkey.onPress = () => this.stdoutEval()
		this.GUI.suggestions.onSelectionChange = () => this.inspectSelectedSuggestion()
		this.GUI.suggestions.onMouseLeftDoubleClick = () => this.setSelectedSuggestion()

		this.inspectorSettings = {
			"update": true,
			"genTime": 0,
			"genTimeMax": 5000,
			"check": function ()
			{
				return this.update && this.genTime < this.genTimeMax
			},
			"lastEntry": undefined
		}

		this.suggestionsSettings = {
			"update": true,
			"genTime": 0,
			"genTimeMax": 5000 * 2,
			"check": function ()
			{
				return this.update && this.genTime < this.genTimeMax
			}
		}

		this.GUI.gui.onTick = this.onTick.bind(this)
	}

	onTick()
	{
		if (this.GUI.gui.hidden || !this.inspectorSettings.lastEntry)
			return

		if (this.inspectorSettings.check())
			this.updateObjectInspector(
				this.inspectorSettings.lastEntry.parent[this.inspectorSettings.lastEntry.token.value],
				this.lastVariableNameExpressionInspector)

		if (this.suggestionsSettings.check())
			this.updateSuggestions(this.GUI.input.caption, false)
	}

	stdoutToggle()
	{
		if (this.GUI.gui.hidden)
			return

		this.GUI.stdout.hidden = !this.GUI.stdout.hidden
		if (this.GUI.stdout.hidden)
			return

		if (!this.inspectorSettings.lastEntry)
			return

		const object = this.inspectorSettings.lastEntry.parent[this.inspectorSettings.lastEntry.token.value]
		const result = this.getObjectRepresentation(object, undefined, undefined, false)
		// Count number of lines
		this.GUI.stdout.caption = ""
		const nLines1 = (result.match(/\n/g) || '').length + 1
		const nLines2 = Math.ceil(result.length / 100)
		this.GUI.stdout.size = Object.assign(this.GUI.stdout.size, {
			"top": -Math.min(Math.max(nLines1, nLines2) * this.vlineSize, this.stdOutMaxVisibleSize) - 10
		})

		this.GUI.stdout.caption = result
	}

	stdoutEval()
	{
		if (this.GUI.gui.hidden)
			return

		const result = this.evalInput()
		this.printToStdout(result)
	}

	printToStdout(text)
	{
		// Count number of lines
		this.GUI.stdout.caption = ""
		const nLines1 = (text.match(/\n/g) || '').length + 1
		const nLines2 = Math.ceil(text.length / 100)
		this.GUI.stdout.size = Object.assign(this.GUI.stdout.size, {
			"top": -Math.min(Math.max(nLines1, nLines2) * this.vlineSize, this.stdOutMaxVisibleSize) - 10
		})

		this.GUI.stdout.caption = text
	}

	getFunctionParameterCandidates(functionObject)
	{
		if (!this.functionAutocomplete.has(functionObject))
			return

		const parameterName = this.functionAutocomplete.get(functionObject)
		if (!(parameterName in this.functionParameterCandidates))
			this.functionParameterCandidates[parameterName] = this.functionParameterCandidatesLoader[parameterName]()

		return this.functionParameterCandidates[parameterName]
	}

	sort(value, candidates)
	{
		return autociv_matchsort(value, candidates)
	}

	sortSearchFilter(parent, candidates)
	{
		if (!(this.searchFilter in this.searchFilterKeys))
			return candidates

		const type = this.searchFilterKeys[this.searchFilter]

		return candidates.sort((a, b) =>
		{
			const isa = this.getType(parent[a]) == type ? 1 : 0
			const isb = this.getType(parent[b]) == type ? 1 : 0
			return isb - isa
		})
	}

	getType(val)
	{
		const type = typeof val
		switch (type)
		{
			case "object": {
				if (val === null) return "null"
				if (Array.isArray(val)) return "array"
				if (val instanceof Set) return "Set"
				if (val instanceof Map) return "Map"
				if (val instanceof WeakMap) return "WeakMap"
				if (val instanceof WeakSet) return "WeakSet"
				if (val instanceof Int8Array) return "Int8Array"
				if (val instanceof Uint8Array) return "Uint8Array"
				if (val instanceof Uint8ClampedArray) return "Uint8ClampedArray"
				if (val instanceof Int16Array) return "Int16Array"
				if (val instanceof Uint16Array) return "Uint16Array"
				if (val instanceof Int32Array) return "Int32Array"
				if (val instanceof Uint32Array) return "Uint32Array"
				if (val instanceof Float32Array) return "Float32Array"
				if (val instanceof Float64Array) return "Float64Array"
				// if (val instanceof BigInt64Array) return "BigInt64Array"
				// if (val instanceof BigUint64Array) return "BigUint64Array"
				else return type
			}
			case "undefined":
			case "boolean":
			case "number":
			case "bigint":
			case "string":
			case "symbol":
			case "function":
				return type
			default:
				return type
		}
	}

	accessFormat(value, access, isString, colored = false, type)
	{
		const esc = (text) => colored ? this.escape(text) : text

		if (colored)
		{
			const color = this.style.type[type] || this.style.type.default
			value = `[color="${color}"]${esc(value)}[/color]`
		}

		switch (access)
		{
			case "dot": return `.${value}`
			case "bracket": return isString ?
				esc(`["`) + value + esc(`"]`) :
				esc(`[`) + value + esc(`]`)
			case "parenthesis": return isString ?
				esc(`("`) + value + esc(`")`) :
				esc(`(`) + value + esc(`)`)
			case "word": return `${value}`
			default: return `${value}`
		}
	}

	// escapeText from a24
	escape(obj)
	{
		return obj.toString().replace(/\\/g, "\\\\").replace(/\[/g, "\\[")
	}

	inspectSelectedSuggestion()
	{
		if (this.GUI.suggestions.selected == -1)
			return

		const text = this.prefix + this.list_data[this.GUI.suggestions.selected]
		const entry = this.getEntry(text)
		if (!entry)
			return

		if (typeof entry.parent == "object" && entry.token.value in entry.parent)
		{
			this.inspectorSettings.lastEntry = entry
			this.updateObjectInspector(entry.parent[entry.token.value], text)
		}
	}

	/**
	 * Sets the selected suggestion in the GUI.
	 *
	 * @return {void}
	 */
	setSelectedSuggestion()
	{
		if (this.GUI.suggestions.selected == -1)
			return

		this.GUI.input.caption = this.prefix + this.list_data[this.GUI.suggestions.selected]
		this.updateSuggestions()
		this.GUI.input.blur()
		this.GUI.input.focus()
		this.GUI.input.buffer_position = this.GUI.input.caption.length
	}

	toggle()
	{
		this.GUI.gui.hidden = !this.GUI.gui.hidden
		if (this.GUI.gui.hidden)
		{
			this.GUI.input.blur()
			return
		}

		this.GUI.input.blur()
		this.GUI.input.focus()
		this.GUI.input.buffer_position = this.GUI.input.caption.length
		if (!this.initiated)
		{
			this.updateSuggestions()
			this.initiated = true
		}
	}

	evalInput(text = this.GUI.input.caption)
	{
		let representation = ""
		try
		{
			const showInStdOut = text.endsWith(">")
			if (showInStdOut)
				text = text.slice(0, -1)

			const result = eval(text)
			representation = this.getObjectRepresentation(result, undefined, undefined, false)
			warn(text + " -> " + representation.slice(0, 200))

			if (showInStdOut)
			{
				this.GUI.stdout.hidden = false
				this.printToStdout(representation)
			}
		}
		catch (er)
		{
			error(er.toString())
			return representation
		}

		text = text.split("=")[0].trim()
		const entry = this.getEntry(text)
		if (!entry)
			return representation

		if (typeof entry.parent == "object" && entry.token.value in entry.parent)
		{
			this.inspectorSettings.lastEntry = entry
			this.updateObjectInspector(entry.parent[entry.token.value], text)
		}

		return representation
	}

	getTokens(text)
	{
		const lex = text.split(/(\("?)|("?\))|(\["?)|("?\])|(\.)/g).filter(v => v)
		// lex ~~  ['word1', '.', 'word2', '["', 'word3', '"]', ...]

		if (!lex.length)
			lex.push("")

		const tokens = []
		for (let i = 0; i < lex.length; ++i)
		{
			if (lex[i] === "[")
			{
				let hasValue = false
				let value = ""
				let hasClosure = false
				let k = 1
				while (i + k < lex.length)
				{
					if (lex[i + k] === "]")
					{
						hasClosure = true
						break
					}
					hasValue = true
					value += lex[i + k]
					++k
				}

				if (!hasClosure)
					value = value.replace(/"$/, "")

				tokens.push({
					"access": "bracket",
					"hasValue": hasValue,
					"hasClosure": hasClosure,
					"value": value,
					"valid": hasValue && hasClosure
				})
				i += k
			}
			else if (lex[i] === "(")
			{
				let hasValue = false
				let value = ""
				let hasClosure = false
				let k = 1
				while (i + k < lex.length)
				{
					if (lex[i + k].endsWith(")"))
					{
						hasClosure = true
						break
					}
					hasValue = true
					value += lex[i + k]
					++k
				}

				if (!hasClosure)
					value = value.replace(/"$/, "")

				tokens.push({
					"access": "parenthesis",
					"hasValue": hasValue,
					"hasClosure": hasClosure,
					"value": value,
					"valid": hasValue && hasClosure
				})
				i += k
			}
			else if (lex[i] === ".")
			{
				let hasValue = i + 1 in lex
				tokens.push({
					"access": "dot",
					"hasValue": hasValue,
					"value": hasValue ? lex[i + 1] : "",
					"valid": hasValue
				})
				i += 1
			}
			else
			{
				let hasValue = i in lex
				tokens.push({
					"access": "word",
					"hasValue": hasValue,
					"value": lex[i],
					"valid": hasValue,
				})
			}
		}
		return tokens
	}

	getEntry(text)
	{
		const tokens = this.getTokens(text)

		let object = global
		let prefix = ""
		let prefixColored = ""

		let entry = {
			"root": true,
			"type": this.getType(object)
		}

		// Dive into the nested object or array (but don't process last token)
		for (let i = 0; i < tokens.length - 1; ++i)
		{
			let token = tokens[i]
			entry = {
				"entry": entry,
				"parent": object,
				"prefix": prefix,
				"prefixColored": prefixColored,
				"token": token,
				"index": i
			}

			// "word" access must and can only be on the first token
			if ((i == 0) ^ (token.access == "word"))
				return

			let parentType = entry.entry.type
			let isMapGet = parentType == "Map" && token.value == "get"
			let validType = parentType == "array" ||
				parentType == "object" ||
				parentType == "function" ||
				isMapGet

			if (!token.valid || !validType)
				return

			// Must bind to the new assignation the instance to not lose "this"
			if (isMapGet)
				object = object[token.value].bind(object)
			else
				object = object[token.value]

			entry.type = this.getType(object)

			prefix += this.accessFormat(token.value, token.access, parentType != "array")
			prefixColored += this.accessFormat(token.value, token.access, parentType != "array", true, parentType)
		}

		return {
			"entry": entry,
			"parent": object,
			"prefix": prefix,
			"prefixColored": prefixColored,
			"token": tokens[tokens.length - 1],
			"index": tokens.length - 1,
		}
	}

	getCandidates(object, access)
	{
		const list = new Set()
		if (this.getType(object) == "function" && "prototype" in object)
			list.add("prototype")

		if ("__iterator__" in object)
			for (let k in object)
				list.add(k)

		if (this.seeOwnPropertyNames)
		{
			const proto = Object.getPrototypeOf(object)
			if (proto)
				for (let name of Object.getOwnPropertyNames(proto))
					if (name !== 'constructor' &&
						name !== "caller" &&
						name !== "callee" &&
						name !== "arguments" &&
						proto.hasOwnProperty(name) &&
						!name.startsWith("__"))
						list.add(name)
		}

		if (this.getType(object) == "array")
		{
			if (access == "dot")
				return Array.from(list)
			else
				list.clear()
		}

		for (let key of Object.keys(object))
			list.add(key)

		return Array.from(list)
	}

	getSuggestions(entry)
	{
		if (entry.token.access == "dot")
		{
			if (entry.index == 0)
				return

			if (entry.entry.type != "object" &&
				entry.entry.type != "function" &&
				entry.entry.type != "array" &&
				entry.entry.type != "Map")
				return

			const candidates = this.getCandidates(entry.parent, entry.token.access)
			let results = entry.token.hasValue ?
				this.sort(entry.token.value, candidates) :
				this.sort("", candidates)
			results = this.sortSearchFilter(entry.parent, results)
			if (results.length == 1 && results[0] == entry.token.value)
				results = []
			return results
		}
		if (entry.token.access == "bracket")
		{
			if (entry.index == 0)
				return

			if (entry.entry.type == "object" ||
				entry.entry.type == "function")
			{
				const candidates = this.getCandidates(entry.parent)
				let results = entry.token.hasValue ?
					this.sort(entry.token.value.replace(/^"|"$/g, ""), candidates) :
					this.sort("", candidates)
				results = this.sortSearchFilter(entry.parent, results)
				if (entry.token.hasClosure && results.length && results[0] == entry.token.value)
					results = []
				return results
			}
			else if (entry.entry.type == "array")
			{
				const candidates = this.getCandidates(entry.parent, entry.token.access)
				let results = entry.token.hasValue ?
					this.sort(entry.token.value, candidates).sort((a, b) => (+a) - (+b)) :
					candidates
				results = this.sortSearchFilter(entry.parent, results)
				if (entry.token.hasClosure && results.length && results[0] == entry.token.value)
					results = []
				return results
			}
		}
		if (entry.token.access == "word")
		{
			if (entry.index != 0)
				return

			const candidates = this.getCandidates(entry.parent)
			let results = entry.token.hasValue ?
				this.sort(entry.token.value, candidates) :
				this.sort("", candidates)
			results = this.sortSearchFilter(entry.parent, results)
			if (results.length == 1 && results[0] == entry.token.value)
				results = []
			return results
		}
		if (entry.token.access == "parenthesis")
		{
			if (entry.index == 0)
				return

			let candidates = []
			if (entry.entry.token.value == "get" && entry.entry.parent instanceof Map)
				candidates = Array.from(entry.entry.parent.keys()).filter(v => this.getType(v) == "string")
			else
				candidates = this.getFunctionParameterCandidates(entry.parent)

			if (!candidates)
				return

			let results = entry.token.hasValue ?
				this.sort(entry.token.value.replace(/^"|"$/g, ""), candidates) :
				this.sort("", candidates)
			if (entry.token.hasClosure && results.length && results[0] == entry.token.value)
				results = []
			return results
		}
	}

	getFormattedSuggestionList(entry, suggestions)
	{
		const truncate = (text, start) =>
		{
			text = text.split("\n")[0]
			let allotted = this.previewLength - start - 3
			return allotted < text.length ? text.slice(0, allotted) + "..." : text
		}

		return suggestions.map(value =>
		{
			if (entry.token.access == "parenthesis")
			{
				let text = entry.prefixColored
				const type = this.getType(value)
				text += this.accessFormat(value, entry.token.access, type == "string", true, type)
				return text
			}

			const type = this.getType(entry.parent[value])
			let text = entry.prefixColored
			text += this.accessFormat(value, entry.token.access, entry.entry.type != "array", true, type)

			// Show variable type
			text += ` [color="${this.style.typeTag}"]\\[${type}\\][/color]`

			let realLength = () => text.replace(/[^\\]\[.+[^\\]\]/g, "").replace(/\\\\\[|\\\\\]/g, " ").length

			// Show instance class name if any
			if (type == "object" && "constructor" in entry.parent[value])
			{
				const name = entry.parent[value]?.constructor?.name
				if (name && name != "Object")
					text += setStringTags(` { ${this.escape(`${name}`)} }`, {
						"color": this.style.classTag
					})
			}
			// Show preview
			else if (type == "boolean" || type == "number" || type == "bigint")
				text += " " + truncate(this.escape(`${entry.parent[value]}`), realLength())
			else if (type == "string")
				text += " " + truncate(this.escape(`"${entry.parent[value]}"`), realLength())

			return text
		})
	}

	updateSuggestionList(entry, suggestions)
	{
		this.GUI.suggestions.list = this.getFormattedSuggestionList(entry, suggestions)
		this.list_data = []
		this.prefix = entry.prefix

		this.GUI.suggestions.size = Object.assign(this.GUI.suggestions.size, {
			"bottom": Math.min(suggestions.length * this.vlineSize, this.suggestionsMaxVisibleSize)
		})

		this.list_data = suggestions.map(value => this.accessFormat(value, entry.token.access, entry.entry.type != "array"))
	}

	processPrefixes(text)
	{
		const original = text

		// Clear prefixes filter
		if (text.startsWith("?"))
		{
			this.searchFilter = ""
			text = text.slice(1)
			this.GUI.sortMode.size = Object.assign(this.GUI.sortMode.size, {
				"left": 0
			})
		}
		// Toggle own property names search
		else if (text.startsWith("p?"))
		{
			this.seeOwnPropertyNames = !this.seeOwnPropertyNames
			text = text.slice(2)
		}
		// searchFilter prefix
		else if (/^\w\?.*/.test(text) && text[0] in this.searchFilterKeys)
		{
			this.searchFilter = text[0]
			text = text.slice(2)

			let type = this.searchFilterKeys[this.searchFilter]
			this.GUI.sortMode.caption = type.slice(0, 6)
			this.GUI.sortMode.textcolor = this.style.type[type] || this.style.type["default"]
			this.GUI.sortMode.size = Object.assign(this.GUI.sortMode.size, {
				"left": -50
			})
		}

		// Caption setter doesn't trigger a textedit event (no infinite loop)
		this.GUI.input.caption = text
		this.GUI.input.buffer_position = Math.max(0, this.GUI.input.buffer_position - (original.length - text.length))

		return text
	}

	updateSuggestions(text = this.GUI.input.caption, lookForPrefixes = true)
	{
		const time = Engine.GetMicroseconds()
		if (lookForPrefixes)
			text = this.processPrefixes(text)

		const entry = this.getEntry(text)
		if (!entry)
			return

		const suggestions = this.getSuggestions(entry)
		if (!suggestions)
			return

		this.updateSuggestionList(entry, suggestions)

		if (typeof entry.parent == "object" && entry.token.value in entry.parent)
		{
			this.inspectorSettings.lastEntry = entry
			this.updateObjectInspector(entry.parent[entry.token.value])
		}

		this.suggestionsSettings.genTime = Engine.GetMicroseconds() - time
	}

	tab()
	{
		if (this.list_data.length)
		{
			this.GUI.input.caption = this.prefix + this.list_data[0]
			this.GUI.input.buffer_position = this.GUI.input.caption.length
		}
		this.updateSuggestions()
	}

	getObjectRepresentation(obj, depth = this.showDepth, prefix = "", format = true)
	{
		const type = this.getType(obj)
		const typeTag = format ?
			` [color="${this.style.typeTag}"]` + this.escape("[") + type + this.escape("]") + `[/color]` :
			""

		if (depth < 1 && (type == "array" || type == "object" || type == "function"))
			return "..." + typeTag

		if (obj == global)
			depth = Math.min(1, depth)


		const colorize = (type, text) => format ?
			`[color="${this.style.type[type] || this.style.type["default"]}"]${this.escape(text)}[/color]` :
			`${text}`

		const childPrefix = prefix + this.spacing
		const representChild = child => this.getObjectRepresentation(child, depth - 1, childPrefix, format);
		const esc = text => format ? this.escape(text) : text
		const iterate = (list, func, intro, outro) =>
		{
			if (!list.length)
				return esc(intro) + " " + esc(outro)
			return esc(intro) + "\n" +
				list.map(func).join(",\n") + "\n" +
				prefix + esc(outro)
		}

		switch (type)
		{
			case "undefined": return colorize(type, type) + typeTag
			case "boolean": return colorize(type, obj) + typeTag
			case "number": return colorize(type, obj) + typeTag
			case "bigint": return colorize(type, obj) + typeTag
			case "symbol": return colorize(type, type) + typeTag
			case "null": return colorize(type, type) + typeTag
			case "string": {
				if (format)
				{
					obj = obj.split("\n").map(t => prefix + t)
					obj[0] = obj[0].slice(prefix.length)
					obj = obj.join("\n")
				}
				return '"' + colorize(type, obj) + '"' + typeTag
			}
			case "function": {
				if (prefix)
					return format ? typeTag : "function"
				try
				{
					return esc(obj.toSource()).replace(/	|\r/g, this.spacing)
				}
				catch (error)
				{
					return format ?
						typeTag + this.escape("Unable to print function [https://bugzilla.mozilla.org/show_bug.cgi?id=1440468]") :
						"Proxy"
				}
			}
			case "array": {
				const child = (val, index) => childPrefix +
					(this.getType(val) == "object" ? index + " : " : "") +
					representChild(val)

				return iterate(obj, child, "[", "]")
			}
			case "object": {
				const list = this.getCandidates(obj)
				const child = key => childPrefix + esc(key) + " : " +
					representChild(obj[key])

				return iterate(list, child, "{", "}")
			}
			case "Set": {
				const list = Array.from(obj)
				const child = value => childPrefix + representChild(value)

				return iterate(list, child, "Set {", "}")
			}
			case "Map": {
				const list = Array.from(obj)
				const child = ([key, value]) => childPrefix + representChild(key) +
					" => " + representChild(value)

				return iterate(list, child, "Map {", "}")
			}
			case "Int8Array":
			case "Uint8Array":
			case "Uint8ClampedArray":
			case "Int16Array":
			case "Uint16Array":
			case "Int32Array":
			case "Uint32Array":
			case "Float32Array":
			case "Float64Array": {
				const list = Array.from(obj)
				const child = (val, index) => childPrefix + colorize("number", val)
				return iterate(list, child, "[", "]")
			}
			default: return typeTag
		}
	}

	updateObjectInspector(object, text = this.GUI.input.caption)
	{
		const time = Engine.GetMicroseconds()
		this.lastVariableNameExpressionInspector = text
		const result = `${this.escape(text.split("=")[0].trim())} : ${this.getObjectRepresentation(object)} `
		this.GUI.inspector.caption = ""
		// Count number of lines
		const nLines1 = (result.match(/\n/g) || '').length + 1
		const nLines2 = Math.ceil(result.length / 100)
		this.GUI.inspector.size = Object.assign(this.GUI.inspector.size, {
			"bottom": Math.min(Math.max(nLines1, nLines2) * this.vlineSize, this.inspectorMaxVisibleSize)
		})
		this.GUI.inspector.caption = result
		this.inspectorSettings.genTime = Engine.GetMicroseconds() - time
	}
}
"use strict";
class ConfigJSON {
    /**
     * @param identifier Must not contain spaces
     * @param saveToDisk If true that data will be saved to disk (at least not by itself)
     * @param implicitSave Will automatically save when the data is modified
     */
    constructor(identifier, saveToDisk = true, implicitSave = true) {
        this.identifier = identifier;
        this.saveToDisk = saveToDisk;
        this.implicitSave = implicitSave;
        this.key = "autociv.data." + this.identifier;
        this.load();
    }
    load() {
        let value = Engine.ConfigDB_GetValue("user", this.key);
        if (value === "") {
            this.data = {};
            if (this.implicitSave)
                this.save();
            return;
        }
        this.data = JSON.parse(decodeURIComponent(value));
    }
    save() {
        let value = encodeURIComponent(JSON.stringify(this.data));
        Engine.ConfigDB_CreateValue("user", this.key, value);
        if (this.saveToDisk){
            try {
                Engine.ConfigDB_WriteValueToFile("user", this.key, value, "config/user.cfg"); // nani vorson from about 2019
            } catch (error) {
                // very seldom i got a error here . maybe 1 time in replay when i run a reply (not sure maybe it has happend also as obeserver. was only a messsage. game not crashed or so)
                ConfigDB_WriteValueToFile("user", this.key, value)                    // its this alpha version 0.0.27 code?


                if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
                    warn(error.message)
                    warn(error.stack)
                }
            }
        }
    }
    isEmpty() {
        return Object.keys(this.data).length === 0;
    }
    hasValue(id) {
        return id in this.data;
    }
    getValue(id) {
        return this.data[id];
    }
    getIds() {
        return Object.keys(this.data);
    }
    setValue(id, value) {
        this.data[id] = value;
        if (this.implicitSave)
            this.save();
    }
    removeValue(id) {
        delete this.data[id];
        if (this.implicitSave)
            this.save();
    }
    removeAllValues() {
        this.data = {};
        if (this.implicitSave)
            this.save();
    }
}
AnimateGUIObject.types.color = {
	"parameters": deepfreeze(["r", "g", "b", "a"]),
	"set": function (GUIObject, object)
	{
		GUIObject.sprite = "color: " + this.toString(object);
	},
	"get": function (GUIObject)
	{
		return Object.assign({ "a": 1 }, this.fromString(GUIObject.sprite.match(/:(.+)$/)[1]));
	},
	"fromString": text =>
	{
		let color = text.match(/[\w\.]+/g).map(v => v / 255);
		switch (color.length)
		{
			case 4: return { "r": color[0], "g": color[1], "b": color[2], "a": color[3] }
			case 3: return { "r": color[0], "g": color[1], "b": color[2] }
			default: return { "r": color[0], "g": color[0], "b": color[0] };
		}
	},
	"fromObject": object => Object.assign({}, object),
	"toString": object =>
	{
		let t = v => (v * 255).toFixed(0);
		return `${t(object.r)} ${t(object.g)} ${t(object.b)} ${object.a === undefined ? "" : t(object.a)}`;
	}
};
var g_linkLongTeam = null; // init should be available during the game and not changed

var g_lastCommand = "";
// var g_lastCommandID = 0;
var g_lastCommandIDmax = 5;
var g_lastCommandID = parseInt (Engine.ConfigDB_GetValue("user", `autocivP.chat.g_lastCommandID`));


var g_iconPrefix = Engine.ConfigDB_GetValue("user", "autocivP.chat.iconPrefix").trim(); // icon prefix iconPrefix should be default <

// warn(`g_iconPrefix = >${g_iconPrefix}<`);

var g_previousCaption = ''

if(isNaN(g_lastCommandID))g_lastCommandID = 0;
// warn('g_lastCommandID = ' + g_lastCommandID); // selfMessage function dont work here



/**
 * @param {*} text - Slice of the text from start to buffer position
 * @param {*} list - List of texts to try to auto-complete
 * @param {*} tries - Number of times to try to autocomplete
 */
tryAutoComplete = function (text, list, tries)
{
    if (!text.length)
        return text

    const wordSplit = text.split(/\s/g)
    if (!wordSplit.length)
        return text

    // Get last single word from text until the buffer position
    const lastWord = wordSplit.pop()
    if (!lastWord.length)
        return text

    let firstFound = ""
    for (var word of list)
    {
        if (word.toLowerCase().indexOf(lastWord.toLowerCase()) != 0)
            continue

        if (!firstFound)
            firstFound = word

        --tries
        if (tries < 0)
            break
    }

    if (!firstFound)
        return text

    // Wrap search to start, cause tries could not complete to 0, means there are no more matches as tries in list.
    if (tries >= 0)
    {
        autoCompleteText.state.tries = 1
        word = firstFound
    }

    text = wordSplit.join(" ")
    if (text.length > 0)
        text += " "

    return text + word
}

// var autoCompleteText_original = function (guiObject, list) // this works without errors
// {
//     const caption = guiObject.caption
//     if (!caption.length)
//         return

//     const sameTry = autoCompleteText.state.newCaption == caption
//     if (sameTry)
//     {
//         const textBeforeBuffer = autoCompleteText.state.oldCaption.substring(0, autoCompleteText.state.buffer_position)
//         const completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
//         const newCaptionText = completedText + autoCompleteText.state.oldCaption.substring(autoCompleteText.state.buffer_position)

//         autoCompleteText.state.newCaption = newCaptionText

//         guiObject.caption = newCaptionText
//         guiObject.buffer_position = autoCompleteText.state.buffer_position + (completedText.length - textBeforeBuffer.length)
//     }
//     else
//     {
//         const buffer_position = guiObject.buffer_position
//         autoCompleteText.state.buffer_position = buffer_position
//         autoCompleteText.state.oldCaption = caption
//         autoCompleteText.state.tries = 0

//         const textBeforeBuffer = caption.substring(0, buffer_position)
//         const completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
//         const newCaptionText = completedText + caption.substring(buffer_position)

//         autoCompleteText.state.newCaption = newCaptionText

//         guiObject.caption = newCaptionText
//         guiObject.buffer_position = buffer_position + (completedText.length - textBeforeBuffer.length)
//     }
// }


/**
 * @param {Object} guiObject - the GUI object
 * @param {Array} list - the list of items
 * @return {undefined} - no return value
 */
const g_autoCompleteText_newMerge = (guiObject, list) => {
  // selfMessage('100: autoCompleteText_newMerge')
  // selfMessage('101: caption.length = ' + guiObject.caption.length)

  chatInputTooltipQuickFixUpdate()

    // warn(`22: last text was >${g_chatTextInInputFild_when_msgCommand}<`);

  const caption = guiObject.caption
  // let caption = guiObject.caption.trim()  // used long time to trim the caption to 23-0705_2249-00 idk if it may dangerous to trim here

  let bugIt = false // new implementation so i will watch longer
	// bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer



  if(bugIt)
    selfMessage(`${linnr1()}: ${caption.toLowerCase()} = ${caption}      gui/common/functions_utility~autociv.js`) //TODO - add to json tab-commands


  // End of caption is maybe not empty

  // if(!caption) // trigers when no caption content is in
  if (!caption.length){ // trigers when no caption content is in
    if(bugIt)
      selfMessage(`${linnr2()}: ${caption} = ${caption} gui/common/functions_utility~autociv.js`)



    if( g_chat_draft.length > 0 ) // this fixes the problem with changing chat context via hotkey a bit. it saves last chat context temporarily and but it in again when you press tab 23-0724_1543-57
    {
      if(bugIt){
        const debugMsg = `139: g_chat_draft = ${g_chat_draft}   gui/common/functions_utility~autociv.js`
        selfMessage(debugMsg)
      }

      if(gameState == 'ingame'){
        // in this state we want super careful
        guiObject.caption = truncateString( g_chat_draft.trim(), 80 )
        guiObject.buffer_position = 0
      }else{
        guiObject.caption = g_chat_draft.trim()
        guiObject.buffer_position = 0
      }
      g_chat_draft = ''
      // g_chatTextInInputFild_when_msgCommand_lines = 0
      g_previousCaption = guiObject.caption
      return
    }

    if(setCaption2LastCommandOfHistory(guiObject)){
      g_previousCaption = guiObject.caption
      return // now the caption is not empty anymore
    }
  }

 if( inputCopySearchReults(guiObject) )
  return

//   selfMessage(`${linnr3()}:  '${g_lastCommand}' `);


  if(caption?.length ){

    if(g_previousCaption == 'communityModToggle'){
      if(bugIt)
        selfMessage(`${linnr4()}: now now now   gui/common/functions_utility~autociv.js `);
        captionCheck_is_communityModToggle_optional_restartOad(caption, true)
    }

    if(captionCheck_is_prettyToggle(caption, true))
    {
      // dont remove to comand from the caption maybe. maybe he will try mor often.
      saveLastCommand2History(caption)
      caption = 'prettyToggle'
      guiObject.caption = 'prettyToggle'
      return
    }




    if(captionCheck_is_communityModToggle_optional_restartOad(caption, false)){
      if(bugIt)
        selfMessage(`${linnr5()}: communitymodtoggle  gui/common/functions_utility~autociv.js `);

      g_previousCaption = 'communityModToggle' // next time it should be restart then and do the chanches
      guiObject.caption = 'communityModToggle' // for some reason that i dont understand must be now lowercase not communityModToggle
      return
    }

    if(g_chatTextInInputFild_when_msgCommand.length > 0){
      if (caption.toLowerCase() == 'msgall') {
        guiObject.caption = g_chatTextInInputFild_when_msgCommand.trim()
        g_previousCaption = guiObject.caption
        guiObject.buffer_position = 0 //  lastLinesString.length;
        return
      }
      const match = caption.toLowerCase().match(/msg(\d+)/);
      if (match) {
        saveLastCommand2History(caption)
        const number = match[1];
        // Handle the extracted number
        // selfMessage('gui/common/functions_utility~autociv.js ' + linnr6()))
        const linesArray = g_chatTextInInputFild_when_msgCommand.trim().split('\n');
        const lastLines = linesArray.slice(-number);
        const lastLinesString = lastLines.join('\n');
        guiObject.caption = lastLinesString
        g_previousCaption = guiObject.caption
        guiObject.buffer_position = 0 //  lastLinesString.length;

        ConfigDB_CreateAndSaveValueA26A27("user", "autocivP.chat.copyAllChatMessages", "true"); // if want select messages from all you net th have all chat messages first/next. => so set the flag to true
        return
      }
    }

    switch (caption.toLowerCase()) {

        // return captionIs_j(guiObject);
      case 'j':
          return captionIs_j(guiObject);
      case 'li':
          guiObject.caption = '/link';
          return;
      case 'whatsAutocivPMod'.toLowerCase():
          guiObject.caption = whatsAutocivPMod;
          return;
      case 'whatsCommunityMod'.toLowerCase():
          guiObject.caption = whatsCommunityMod;
          return;
      case 'legend'.toLowerCase():
          guiObject.caption = `legend: ♤ proGUI mod, ♇ autocivP mod`
          return;
      case '/legend'.toLowerCase():
          guiObject.caption = `legend: ♤ proGUI mod, ♇ autocivP mod`
          return;
      case 'hiall':
          return captionIs_hiall(guiObject);
      case 'me':
          return captionIs_me(guiObject);
      case 'meurl':
          return captionIs_meURL(guiObject);
      case 'meu': // synonym. if you in hurry
          return captionIs_meURL(guiObject);
      case 'modsImCurrentlyUsing'.toLowerCase():
        return captionIs_modsImCurrentlyUsing(guiObject);
        // selfMessage('caption.toLowerCase() = ' + caption.toLowerCase());
      case 'timeNow'.toLowerCase():
        // selfMessage('162: caption.toLowerCase() = ' + caption.toLowerCase());
        /*!SECTION
        todo: this is not working in lobby. needs implementd again
        JavaScript error:
        gui/common/functions_utility~autociv.js line 163
        g_NetworkCommands['/whatstimeNow'] is not a function
        */
        try {
          return g_NetworkCommands["/whatstimeNow"]()
        } catch (error) {
          selfMessage('inside lobby whatstimeNow is not a function, at the moment. and there is no will to fix it at the moment ;) Motivate me. its not so very importand command. other stuff is fine.');
          if(g_selfNick =="seeh"){ //NOTE -  developers want to see the error in the console
            warn(error.message)
            warn(error.stack)
          }
          return
        }
      return

    } // switch end

    const firstChar = caption.toString().charAt(0); // or str[0]

    // selfMessage(`${linnr7()}: doppelPosting? '${g_lastCommand}' `);
    // selfMessage(`${linnr8()}: g_lastCommand = '${g_lastCommand}' , caption = '${caption}' `);

    if(bugIt)
      selfMessage(`${linnr9()}: '${g_previousCaption}' ?= '${caption}'  gui/common/functions_utility~autociv.js `);

    if(g_previousCaption == caption){ // g_lastCommand
      // selfMessage(`${linnr10()}: doppelPosting? '${g_lastCommand}' gui/common/functions_utility~autociv.js `);

      const firstChar = caption.charAt(0); // or str[0]
      if(firstChar.match(/[‹›]/) ){
        g_previousCaption = caption
        return remove_delimiters_from_chat_icon_message(guiObject, caption);

      }

      if(bugIt)
        selfMessage(`${linnr11()}: doppelPosting? '${g_lastCommand}' | captionCheck_is_communityModToggle_optional_restartOad |  gui/common/functions_utility~autociv.js `);
      captionCheck_is_communityModToggle_optional_restartOad(caption, true) // if is communitymodtoggle restart

      if(bugIt)
        selfMessage(`${linnr12()}: tries = ${autoCompleteText.state.tries} |  gui/common/functions_utility~autociv.js `);


      if(autoCompleteText.state.tries !=1 && setCaption2nextCommandOfHistory(guiObject)){
        g_previousCaption = caption
        return
      }
    } // end of doppelPosting


    // const textBeforeBuffer = autoCompleteText.state.oldCaption.substring(0, autoCompleteText.state.buffer_position)
    // const textBeforeBuffer = guiObject.caption



  // selfMessage('caption = ' + caption)
  // Engine.ConfigDB_CreateAndSaveValue("user", "autocivP.chat.lastCommand", caption); // is not a function error in Version a26 aut 23-0605_1920-25
  const sameTry = ( autoCompleteText.state.newCaption == caption )
  if (sameTry){

    if(bugIt)    selfMessage(`autoCompleteText.state.tries = ${autoCompleteText.state.tries} ${linnr13()}`);


    if(autoCompleteText_sameTry_eg_userName_civName(guiObject, list)){
      return // such result should not be saved in the command history. therefore return
    }else{
      if(bugIt)
        selfMessage(`${linnr14()}: doppelPosting? '${g_lastCommand}' gui/common/functions_utility~autociv.js `);
        g_previousCaption = guiObject.caption

    }

  }else{
    if(bugIt)
      selfMessage(`${linnr15()}:  gui/common/functions_utility~autociv.js `);

    if(autoCompleteText_firstTry_eg_userName_civName(guiObject, caption, list)){
      g_previousCaption = guiObject.caption
      return // such result should not be saved in the command history. therefore return
    }
    g_previousCaption = guiObject.caption

  }



    if( is_transGGWP_needet( caption, firstChar, g_iconPrefix,guiObject) )  {
      const captionBegin = caption.toString()
      let captionTrimed = captionBegin.substring(g_iconPrefix.length)
      const minMatchScore = (captionTrimed.length > 20) ? 0.8 : (g_iconPrefix.length ? 0.3 :  0.55 ) // user name will be replaced later. i want have .3 but some users dont be found so easy ... hmmm // user name will be replaced later. i want have .3 but some users dont be found so easy ... hmmm // user name will be replaced later. i want have .3 but some users dont be found so easy ... hmmm

      // selfMessage(`${linnr16()}: gameState '${gameState}' `);
      if(gameState == "ingame"){
       // Help me ☞here
       const pattern = /^help\b/i;
       const hasPattern = pattern.test(guiObject.caption);
       if(hasPattern){
        //  selfMessage(`${linnr17()}: gameState '${gameState}' `);
         captionTrimed = 'helpme' // ingame ist much more importand when help pings other team players then list all the commands via the /help command. more important to have a easy comunication with team. make sure that thiy keyword is still i the json file
       }
     }

      // let allIconsInText =  Engine.Translate( transGGWP_markedStrings_I(captionTrimed, minMatchScore) )
      let allIconsInText =  transGGWP_markedStrings_I(captionTrimed, minMatchScore)

      const key = "autocivP.chat.no_icon_delimiters";
      const no_icon_delimiters = ( Engine.ConfigDB_GetValue("user", key) === "true" )
      if( no_icon_delimiters )
        allIconsInText = remove_delimiters_from_chat_icon_message(guiObject, allIconsInText);


      try {
        const guiObject = Engine.GetGUIObjectByName("chatInput");
        // guiObject.blur(); // remove the focus from a GUI element.
        guiObject.focus();
        // selfMessage('230: allIconsInText = ' + allIconsInText);

        if(captionBegin != allIconsInText){
          const isCaptionNumeric = (allIconsInText[0] >= '0' && allIconsInText[0] <= '9')
          if(isCaptionNumeric)
            allIconsInText = `  ${allIconsInText}`
            // add two spaces to the beginning so user can easily change the number to and add later maybe a name (ping user) at the very beginning

          if(gameState != "ingame"){ // prefent for unwanted replacments for e.g. in gamesetup
            // 90 metal please
            const pattern = /\d+ \w+ please/;
            const hasPattern = pattern.test(allIconsInText);
            if(hasPattern){
              // selfMessage(`${linnr18()}: gameState '${gameState}' `);
              return
            }
          }

          g_previousCaption = captionTrimed
          guiObject.caption = allIconsInText

          guiObject.buffer_position = isCaptionNumeric ? 2 : allIconsInText.length;

          // sets the buffer/corsor position to the beginning

          if(gameState == "ingame"){
            const pattern = /\d+ \w+ please/;
            const hasPattern = pattern.test(allIconsInText);
            if(hasPattern)
             guiObject.buffer_position = 2 // set cursor to beginning of this(btw there a spaces before): 90 food please
          }

          if( true ){
            // ‹away from keyboard
            // selfMessage(`${linnr19()}: away from keyboard`)
            const pattern = /away from keyboard/;
            const hasPattern = pattern.test(allIconsInText);
            if(hasPattern){
             guiObject.buffer_position = (no_icon_delimiters) ? 20 : 21 // set cursor to beginning of this(btw there a spaces before): 90 food please
            }
          }

          // g_lastCommand = allIconsInText
          // saveLastCommand2History(captionTrimed) // not everything should be saved. only the important commands. not all chat content

          // if(setCaption2nextCommandOfHistory(guiObject)){
          //   g_previousCaption = guiObject.caption
          //   return
          // }


          return // this return was maybe missing 23-0705_2302-57 without this return some crases happened in oberver mode !!!!!! 23-0705_2305-59
        }
      }catch (error) {

        if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
          warn('290: ' + error.message)
          warn('291: ' + error.stack)
        }
      }
    }
    // if(g_lastCommand == caption){
    //   selfMessage(`${linnr20()}: doppelPosting? '${g_lastCommand}' `);
    //   setCaption2nextCommandOfHistory(guiObject)
    // }
    if(g_previousCaption == caption ){ // || g_lastCommand == caption
      // selfMessage(`${linnr21()}: doppelPosting? '${g_lastCommand}' `);
      if(setCaption2nextCommandOfHistory(guiObject)){

        g_previousCaption = guiObject.caption
        // setCaption2nextCommandOfHistory(guiObject)

        return
      }
    }

  }

  // try test send flare. dont work
  // let minimapPanel = Engine.GetGUIObjectByName("minimapPanel")
  // minimapPanel.children[2].focus();
  // let objName = 'flar'
  // selfMessage(`${linnr22()}: ${objName} = ${objName}`)

  g_previousCaption = caption


};


/**
 * Auto completes the text AGAIN in the given GUI object using the provided list of options.
 *
 * @param {object} guiObject - The GUI object to autocomplete the text in.
 * @param {array} list - The list of options to use for autocompletion.
 */
function autoCompleteText_sameTry_eg_userName_civName(guiObject, list)
{

  let bugIt = false // new implementation so i will watch longer
  // bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer

  const textBeforeBuffer = autoCompleteText.state.oldCaption.substring(0, autoCompleteText.state.buffer_position)
  const completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
  const newCaptionText = completedText + autoCompleteText.state.oldCaption.substring(autoCompleteText.state.buffer_position)
  autoCompleteText.state.newCaption = newCaptionText
  try {
    guiObject.caption = newCaptionText
    guiObject.focus()
  }catch (error) {
    if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
      warn(error.message)
      warn(error.stack)
    }
  }
  // ConfigDB_CreateAndSaveValueA26A27("user", "autocivP.chat.lastCommand", newCaptionText);
  try {
    // saveLastCommand2History(newCaptionText);     // not everything should be saved. only the important commands. not all chat content
  } catch (error) {
    // happens in the lobby console when double press tab 23-0622_2013-26
    if(bugIt){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
      error('double pressed tab to fast?')
      warn(error.message)
      warn(error.stack)
    }
  }

  if(guiObject.caption.charAt(0) !== '/') {  // if you want toggle through the / commands it should be different from the the behavior wen you pink somebody
    if(bugIt)
      selfMessage(`${linnr23()}: textBeforeBuffer = '${textBeforeBuffer}' gui/common/functions_utility~autociv.js`)
    guiObject.buffer_position = autoCompleteText.state.buffer_position + (completedText.length - textBeforeBuffer.length)
  }

  if(textBeforeBuffer != completedText ){ // || g_lastCommand == caption
    // warn(`370: true`)
    return true
  }
  return false
}


/**
 * Auto complete a given text like userName, civName in a user interface field.
 *
 * @param {Object} guiObject - the GUI object representing the user interface field.
 * @param {string} caption - the current caption of the user interface field.
 * @param {Array} list - the list of possible auto complete options.
 * @return {boolean} true if the auto complete was successful, false otherwise.
 */
function autoCompleteText_firstTry_eg_userName_civName(guiObject, caption, list)
{
  let bugIt = false // new implementation so i will watch longer
  // bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer

  const buffer_position = guiObject.buffer_position
  autoCompleteText.state.buffer_position = buffer_position
  autoCompleteText.state.oldCaption = caption
  autoCompleteText.state.tries = 0

  const textBeforeBuffer = caption.substring(0, buffer_position)
  if(bugIt){
    selfMessage(`${linnr24()}: \n\n gui/common/functions_utility~autociv.js`);
    selfMessage(`${linnr25()}: textBeforeBuffer = ${textBeforeBuffer}`);
  }
  let completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
  if(caption.charAt(0) !== '/') {
    const usernamePattern = /^[\S]+\s\([^()]*\)/i;
    // const username = "seeh (1205)";

    if (usernamePattern.test(completedText))
      completedText += ' ' // e.g. username ith a space helps to fast write next text

  }

  const newCaptionText = completedText + caption.substring(buffer_position)



  autoCompleteText.state.newCaption = newCaptionText

  if(bugIt){
    selfMessage(`${linnr26()}: completedText = ${completedText}`);
    selfMessage(`${linnr27()}: tries = ${autoCompleteText.state.tries}`);
    selfMessage(`${linnr28()}: newCaptionText = ${newCaptionText}`);
    selfMessage(`${linnr29()}: completedText = ${completedText}`);
  }

  try{
    guiObject.caption = newCaptionText
    guiObject.focus();

    if(caption.charAt(0) === '/') {
      if(bugIt)      selfMessage(`${linnr30()}: -----------------------------------------`)
      // asumption that are slash commands maybe you want toggle through them
      // guiObject.buffer_position = (textBeforeBuffer.length)
    }else{
      if(bugIt)      selfMessage(`${linnr31()}: =========================================`)
      // if you want ping a user the cursor should be later at the end
      guiObject.buffer_position = buffer_position + (completedText.length - textBeforeBuffer.length)
    }

    if(bugIt){
      selfMessage(`${linnr32()}: buffer_position = ${guiObject.buffer_position}`);
      selfMessage(`${linnr33()}: textBeforeBuffer = ${textBeforeBuffer}`);
    }

    if(textBeforeBuffer != completedText ){ // || g_lastCommand == caption
      return true
    }

  }catch (error) {
    if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
      warn('396' + error.message)
      warn('397' + error.stack)
    }
  }
  return false
}

/*!SECTION
autoCompleteText cannot renamed in:
gui/common/functions_utility~autociv.js line 431
becouse then you get a error:
assignment to undeclared variable g_autoCompleteText
==> its defined in external
*/
autoCompleteText = g_autoCompleteText_newMerge // gui/common/functions_utility~autociv.js
// autoCompleteText = autoCompleteText_original


/* autoCompleteText.state is not a global variable. It is a property of the autoCompleteText object.
The autoCompleteText object is defined above in the code, and the .state property is used to store and track the previous texts for auto-completion.
This object is likely used within the scope of the module or function where it is defined.
*/
// Used to track previous texts from autocompletion to try next autocompletion if multiples apply.
autoCompleteText.state = {
    "buffer_position": 0,
    "newCaption": "",
    "oldCaption": "",
    "tries": 0
}


// Use the JS cache, instead of recomputing the same color
const autociv_ColorsSeenBefore = {};

/**
 * Some text colors must become brighter so that they are readable on dark backgrounds.
 * Modified version from gui/lobby/LobbyPage/PlayerColor.GetPlayerColor
 * Additional check for "perceived brightness", if the color is already bright enough don't change it,
 * otherwise go up in small incremental steps till it is bright enough.
 * https://www.w3.org/TR/AERT/#color-contrast
 * @param   {string}  color                 string of rgb color, e.g. "10 10 190" ("Dark Blue")
 * @param   {number}  brightnessThreshold   Value when a color is considered bright enough; Range:0-255
 * @return  {string}                        string of brighter rgb color, e.g. "100 100 248" ("Blue")
*/
function brightenedColor(color, brightnessThreshold = 110)
{
    // check if a cached version is already available
    let key = `${color} ${brightnessThreshold}`
    if (!autociv_ColorsSeenBefore[key])
    {
        let [r, g, b] = color.split(" ").map(x => +x);
        let i = 0;
        while (r * 0.299 + g * 0.587 + b * 0.114 <= +brightnessThreshold)
        {
            i += 0.001;
            const [h, s, l] = rgbToHsl(r, g, b);
            [r, g, b] = hslToRgb(h, s, l + i);
        }
        autociv_ColorsSeenBefore[key] = [r, g, b].join(" ");
    }
    return autociv_ColorsSeenBefore[key];
}

function ConfigDB_CreateAndSaveValueA26A27(user, key, value, isEmptyAvalueAllowed = false){

    // ConfigDB_CreateAndSaveValue is not a function error in Version a26 but in a27 23-0605_1920-25
    if(!user || !key || ( !isEmptyAvalueAllowed && value.length <= 0 ) ){
        // error('23-0625_0609-52');
        warn(`!user=${user} || !key=${key} || !value=${value}`)
        return false;
    }

    if(versionOf0ad != '0.0.26')
        Engine.ConfigDB_CreateAndSaveValue(user, key.toString(), value.toString()); // maybe 0.0.26 or higher
    else{
        Engine.ConfigDB_CreateValue(user, key, value);
        Engine.ConfigDB_WriteFile(user, "config/user.cfg");
    }
    return

    // try {
    //     Engine.ConfigDB_CreateAndSaveValue(user, key.toString(), value.toString());
    // } catch (error) {
    //     Engine.ConfigDB_CreateValue(user, key, value);
    //     Engine.ConfigDB_WriteFile(user, "config/user.cfg");
    // }
};









function saveThisModProfile(nr, autoLabelManually) {
    const modsFromUserCfg_const = Engine.ConfigDB_GetValue(
      "user",
      "mod.enabledmods"
    );
    const name = "modProfile.p" + nr;
    const isEmptyAvalueAllowed = true
    const modProfile = Engine.ConfigDB_GetValue("user", name);
    const nameLabel = "modProfile.p" + nr + "label";

    // warn("check if ModProfiles has changed")

    const modProfile_alwaysIn_Key = 'modProfile.alwaysIn'
    const modProfile_alwaysIn_Default = 'localratings feldmap'
    const mo = Engine.ConfigDB_GetValue("user", modProfile_alwaysIn_Key );
    if(!mo)
      ConfigDB_CreateAndSaveValueA26A27("user", modProfile_alwaysIn_Key, modProfile_alwaysIn_Default)

    const alwaysInReplayDefaultsKey = 'modProfile.alwaysInReplay'
    const alwaysInReplayDefaults = 'boonGUI'
    const modProfilealwaysInReplay = Engine.ConfigDB_GetValue("user", );
    if(!modProfilealwaysInReplay)
      ConfigDB_CreateAndSaveValueA26A27("user", alwaysInReplayDefaultsKey, alwaysInReplayDefaults)

    if (!modProfile) { // add defaults
      // warn("133")
      let clean = "";
      switch (nr) {
        case 0: // p0
          clean = modsFromUserCfg_const.replaceAll(/[^\w\d\-]+/g, " ");
          break;
        case 1:
          clean = "no-blood-and-gore-mod"; // proGUI was removed from default 23-0730_1210-33
          break;
        case 2:
          clean = "community-mod proGUI";
          break;
        case 3:
          clean = "boonGUI";
          break;
        case 4:
          clean = "community-maps-2 kush-extreme 10ad";
          break;
        case 5:
          clean = "mainland-twilight";
          break;
        default:
            error('should no happen');
            break;
      }

      ConfigDB_CreateAndSaveValueA26A27("user", name,clean, isEmptyAvalueAllowed)

      const cleanLabel = clean.replaceAll(/([^ ]{3})[^ ]+/g, "$1");
      ConfigDB_CreateAndSaveValueA26A27("user", nameLabel,cleanLabel, isEmptyAvalueAllowed)

    } else {
      let clean = modProfile.replaceAll(/[^\w\d\-]+/g, " ");

      const showDebugWarning = false
      if (clean != modProfile) {
        // correct profile if necesarry
        ConfigDB_CreateAndSaveValueA26A27("user", name,clean, isEmptyAvalueAllowed)
        if(showDebugWarning)warn("modProfile.p" + nr + " saved with =" + clean + "=");
      }
      if (!autoLabelManually) {
        const cleanLabel = clean.replaceAll(/([^ ]{3})[^ ]+/g, "$1");
        ConfigDB_CreateAndSaveValueA26A27("user", nameLabel,cleanLabel, isEmptyAvalueAllowed)
        if(showDebugWarning)warn("autoLabel" + nr + " saved with =" + cleanLabel + "=");
      }
    }
  }
  function enableThisModProfile(nr) {
    if (
      Engine.ConfigDB_GetValue("user", "modProfile.p" + nr + "enabled") == "true"
    ) {
      const modsFromUserCfg_const = Engine.ConfigDB_GetValue(
        "user",
        "mod.enabledmods"
      );
      const profKey = "modProfile.p" + nr;
      const modProfile = Engine.ConfigDB_GetValue("user", profKey);
      let clean = '';



      clean =
        "mod public " +
        modProfile.replaceAll(/\b(mod\s+public)\b\s*/g, "")

        clean = addModProfileAlwaysInAlsoAddAutocivPatTheEnd(clean)


      if (clean != modsFromUserCfg_const) {
        warn("save:" + nr);
        warn(clean);

        // function RestartEngine(): any;

        warn(clean);
        warn("is enabled next when 0ad is started.");
        // warn(modsFromUserCfg_const);
        // warn("_____________________");
        // Engine.ConfigDB_WriteValueToFile(
        //   "user",
        //   "modProfile.restartNext",
        //   "true",
        //   "config/user.cfg"
        // );

        ConfigDB_CreateAndSaveValueA26A27("user", "modProfile.backup",modsFromUserCfg_const)
        ConfigDB_CreateAndSaveValueA26A27("user", "mod.enabledmods",clean)
        // Engine.SetMods(clean) // get error: Engine.SetMods is not a function

        // return true;
        // state.needsRestart = true;
        // configSaveToMemoryAndToDisk(key, settings[key]);

        // Engine.SetMods(clean); // SetMods is not a function here :(
        // Engine.RestartEngine(); // RestartEngine(1);  is not a function here :(

        // state.reasons.add("New mode-profile settings added.");

        // Engine.RestartInAtlas(1) // works. it start atlas ... 23-0703_1555-52 dont like it

        // Engine.RestartInEngine(1) // is not a function
        // Engine.RestartEngine(1) // is not a funtion
        // Engine.RestartEngine.call(1) // is undefined


        // Engine.SetMods()


        // function GetAvailableMods(): any
        // function RestartEngine(): any
        // function SetMods(): any
        // function ModIoStartGetGameId(): any
        // function ModIoStartListMods(): any
        // function ModIoStartDownloadMod(): any
        // function ModIoAdvanceRequest(): any
        // function ModIoCancelRequest(): any
        // function ModIoGetMods(): any



        // let message = `
        // Mods changed
        // Restart Engine ?`;
        //     messageBox(
        //       500,
        //       300,
        //       message,
        //       "AutoCivP mod autoOrderFix notice",
        //       ["Ok, change", "No"],
        //       [
        //         () => {
        //           Engine.Restart(1) // works
        //         },
        //         () => {},
        //       ]
        //     );
          // try {


          if(false){ // outdated
            const key = "autocivP.gamesetup.restart";
            ConfigDB_CreateAndSaveValueA26A27("user", key, 'restart');
            Engine.SwitchGuiPage("page_pregame.xml");
          }else{
            Engine.Exit(1)


          }


            // Engine.Restart(1) // works sometimes Engine. and sometimes: Restart is not a function
          // } catch (error) {
          //   warn(error.message)
          //   warn(error.stack)
          //   warn('well done. Please start 0ad now again.')
          //   Engine.Exit(1) // works
          // }

        // Engine.Exit(1) // works

      } else {
        // warn("dont save " + nr);
      }
      return true;
    }
    return false;
  }

  function check_modProfileSelector_settings() {
    const autoLabelManually = Engine.ConfigDB_GetValue("user", "modProfile.autoLabelManually") === "true";

    [...Array(6)].forEach((_, k0_5) => saveThisModProfile(k0_5, autoLabelManually));

    for (let k0_5 = 0; k0_5 <= 5; k0_5++) {
      const nameOfCheckBox = "modProfile.p" + k0_5 + "enabled";
      if (Engine.ConfigDB_GetValue("user", nameOfCheckBox) === "true") {
        if (enableThisModProfile(k0_5)) {
          warn(`${k0_5} was enabled as your default mod-configuration.`);
          ConfigDB_CreateAndSaveValueA26A27("user", nameOfCheckBox, "false");
          warn(`${k0_5} checkBox disabled (if enabled have conflict with the normal mod selector)`);
          return true;
        }
        break;
      }
    }

    return false;
  }


// function addModProfileAlwaysInAlsoAddAutocivPatTheEnd(clean){
//   const modProfileAlwaysIn = Engine.ConfigDB_GetValue("user", 'modProfile.alwaysIn');
//   const modProfileAlwaysInArray = modProfileAlwaysIn.split(/\s/);
//   modProfileAlwaysInArray.forEach(value => {
//     const regex = new RegExp('\b' + value + '\b\s*' ,'gi');
//     clean = clean.replaceAll(regex, ""); // mod\s+public is default. boring to save it
//   })
//   // autocivP its at the end and shoud at the end
//   if(clean.indexOf(' autocivP')<=0)
//     clean += ' autocivP'
//   clean = clean.replaceAll('autocivP', `${modProfileAlwaysIn} autocivP` ); // mod\s+public is default. boring to save it
//   return clean
// }

function addModProfileAlwaysInAlsoAddAutocivPatTheEnd(clean) {
  const modProfileAlwaysIn = Engine.ConfigDB_GetValue("user", 'modProfile.alwaysIn');
  const modProfileAlwaysInArray = modProfileAlwaysIn.split(/\s/);

  modProfileAlwaysInArray.forEach(value => {
    const regexPattern = new RegExp('\b' + value + '\b\s*' ,'gi');
    const regex = new RegExp(regexPattern, 'gi');
    clean = clean.replaceAll(regex, "");
  });

  if (!clean.includes(' autocivp'))
    clean += ' autocivp';

  return clean.replace(/\bautocivP\b/ig, `${modProfileAlwaysIn} autocivp` );
}


function restart0ad()
{
	try {
		Engine.Restart(1) // works sometimes Engine. and sometimes: Restart is not a function
	} catch (error) {
		if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
			warn(error.message)
			warn(error.stack)
		}
		warn('well done. Please start 0ad now again.')
		Engine.Exit(1) // works
	}
}

function captionIs_j(guiObject){
    // "Select chat addressee." "Everyone"=0 "Allies"=1 Enemies=2 Observers=3
    const chatAddressBox = Engine.GetGUIObjectByName("chatAddressee"); // found this name in binaries/data/mods/public/gui/session/chat/chat_window.xml

  if(gameState != "ingame" || chatAddressBox.selected != 1){ // 1 is Allies
    let text = `to use jiti in you team: 1. open Ally-Chat 2. write j⟦Tab⟧ then enter. 3. write li⟦Tab⟧ or /link`
    selfMessage(text)
    return
}

if (g_linkLongTeam == null) {
    const linkidShort = Date.now().toString().substring(10);
    // not open this link always. if you have it already probably
    g_linkLongTeam = `https://meet.jit.si/0ad${linkidShort}audio`;
    // doOpenJitsiLink = true;
    if(false){ // maybe better not use it at the moment. maybe later. in a future version. to much confusion
        try {
            openURL(g_linkLongTeam); // its not necesary. if error use /link later
        } catch (error) {

        }
    }
}
//   selfMessage(Engine.team[0]); // state is not defined
  // caption = g_linkLongTeam;
  const inviteJitsiText =  `Please open following link for team-audio-chat in your web browser. type li⟦Tab⟧ or /link<enter>. Only a web browser is required. ${g_linkLongTeam} `;
//   guiObject.caption = '/link'; //  inviteJitsiText;
  guiObject.caption = inviteJitsiText;
//   sendMessage(`${inviteJitsiText}`); // TODO: it send to all not only to Allied

// selfMessage(g_linkLongTeam); // its only a selfMessage. not read by botManager
// BotManager.openURL(g_linkLongTeam); // is not a function
// let err = botManager.openLink(g_linkLongTeam); // is not a function


// botManager.setMessageInterface("ingame");
// let err = botManager.get("link").openLink(g_linkLongTeam); // this get the link from the chat.
// if (err)
//     selfMessage(err);

return true;

}

function captionIs_me(guiObject){
  const key = "autocivP.msg.me";
  const text = Engine.ConfigDB_GetValue("user", key);
  if(!text)
      selfMessage('me is empty.');
  else
    guiObject.caption = text
  return;
}
function captionIs_meURL(guiObject){
  const key = "autocivP.msg.meURL";
  const text = Engine.ConfigDB_GetValue("user", key);
  if(!text)
      selfMessage('url is empty.');
  else
    guiObject.caption = text
  return;
}
function captionIs_hiall(guiObject){
  const key = "autocivP.msg.helloAll";
  const helloAll = Engine.ConfigDB_GetValue("user", key);
  if(!helloAll)
    selfMessage('helloAll is empty.');
  else
    guiObject.caption = helloAll
  selfMessage('set /hiAll yourWelcomeText or use /hiAll yourWelcomeText or send by /hiAll or helloAll tab, to edit it first.');
  return;
}
function captionIs_modsImCurrentlyUsing(guiObject){ // this function will be triggerd from by in game chat
  const modEnabledmods = Engine.ConfigDB_GetValue(
    "user",
    "mod.enabledmods"
  );
  // sendMessage(`Mods I'm currently using: ${modEnabledmods.slice(11,)}` );
  let text = `Mods I'm currently using: ${modEnabledmods.slice(11,)} ${g_previous_autocivPVersion}`;
  text = text.replace('localratings', 'localRatings♒') //  ♡ autocivP❧♣▦▣ mod
  text = text.replace('feldmap', 'feldMap▦') //  ♡ autocivP❧♣▦▣ mod

  text = text.replace('proGUI', 'proGUI♤') //  ♡ autocivP❧♣▦▣ mod
  // text = text.replace('autocivP', 'autocivP☼') //  ♡ autocivP❧♣▦▣ mod
  text = text.replace(/\bautocivP\b/ig, 'autocivP♇') //  ♡ autocivP❧♣▦▣ mod

  guiObject.caption = text;
  guiObject.buffer_position = text.length
  return;
}

/**
 * Remove special tags delimiter from the caption and update the GUI object's caption.
 *
 * @param {Object} guiObject - The GUI object to update.
 * @param {string} caption - The caption to process.
 */
function remove_delimiters_from_chat_icon_message(guiObject, caption){
  caption = caption.replace(/[‹›]/g, ''); // cut out all special tags delimiter
  g_lastCommand = caption
  // guiObject.caption = caption
  // selfMessage(`161 ${caption.toLowerCase()} = ${caption}`)
  // selfMessage(`169 ${caption}`)
  guiObject.caption = caption
  return caption
}

/**
 * Determines if the function is transGGWP_needet.
 *
 * @param {string} caption - The caption parameter.
 * @param {string} firstChar - The firstChar parameter.
 * @param {string} iconPrefix - The iconPrefix parameter.
 * @param {object} guiObject - The guiObject parameter.
 * @return {boolean} The result of the function.
 */
function is_transGGWP_needet(caption, firstChar, iconPrefix, guiObject) {
  const doTabReplacmentWor_gl_hf_gg_wp_stuff = true; // usefull for debugging maybe
  return doTabReplacmentWor_gl_hf_gg_wp_stuff
  &&
  (
    caption.length > 1 // prevent conflict with seldon username
    ||
    !firstChar.match(/[a-z]/i) // not a  a-z(ignoreCase) first lettter
  )
  &&
    // !firstChar.match(/[A-Z]/) // not Upercase A-Z first lettter. Upercase is not recomanded as seach words. especially not in a shorter text. Now fixed: Ha => Han, before it was Ha => hand
    !caption.match(/\b[A-Z]/) // not Upercase word start A-Z in caption. more strict. Easier to explain and maybe easier to use and remeber this rule, then only use this rule for the first letter
  &&
  (
    caption.length <= 90 //NOTE - 300 maybe too long . prefent multiple repacment
    || guiObject.buffer_position > 14 // maybe user want gg wp replacments in a longer text and cursor is in the middle or at the end
  )
  &&
  (
    !iconPrefix.length && firstChar != '/'
    ||
    firstChar == iconPrefix
  )
}

function setCaption2LastCommandOfHistory(guiObject){


    let doDebug = false // debug session
    // doDebug = true // debug session

    let lastCommand;
    const is_g_lastCommandID_correkt = ( !isNaN(g_lastCommandID) && g_lastCommandID >= 0 )

    if( is_g_lastCommandID_correkt ){
        lastCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${g_lastCommandID}`);


        // if(gameState == "ingame" || isSelfHost() != true){
        if(gameState == "ingame" || g_selfIsHost != true){
          if(/^\/p|^\/\d/.test(lastCommand)){ //  /p or /\d
            // selfMessage(`hide mapCofigProfileComands in ingame state ( ${lastCommand} )`)
            g_lastCommandID = getNextLastCommandID()
            return true
          }
        }


    }else{
        error('23-0628_0020-57')
        selfMessage(`ERROR: g_lastCommandID is not correct.`)
    }
    if(!lastCommand)
        return false

    if(doDebug)
      selfMessage(`${linnr34()}: lastCommand = ${lastCommand}`)

    g_previousCaption = guiObject.caption
    guiObject.caption = lastCommand
    g_lastCommand = lastCommand
    return true
}

/**
 * Sets the caption of the next command in the history to the given GUI object.
 *
 * @param {Object} guiObject - The GUI object to set the caption to.
 * @return {boolean} Returns true if the caption is successfully set, false otherwise.
 */
function setCaption2nextCommandOfHistory(guiObject){
  let nextID = getNextLastCommandID()
  g_lastCommandID = nextID;
  // selfMessage(`${linnr35()}: >>>>>>>>${g_lastCommandID}<<<<<<<< ' = g_lastCommandID`);
  // selfMessage(`${linnr36()}: nextID = ${nextID}'  gui/common/functions_utility~autociv.js`);
  let nextCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${nextID}`);
  // selfMessage(`${linnr37()}: >>>${nextCommand}<<<  gui/common/functions_utility~autociv.js`);
  // autocivP.chat.lastCommand4 = "jajaja"

  // if(isSelfHost() != true)
  //   selfMessage(`${linnr38()}: g_selfInHost = ${g_selfInHost}`)


  // if(gameState == "ingame" || isSelfHost() != true){ // obsolete
  if(gameState == "ingame" || g_selfIsHost != true){
    if(/^\/p|^\/\d/.test(nextCommand)){ //  /p or /\d
      // selfMessage(`hide mapCofigProfileComands in ingame state ( ${nextCommand } )`)
      g_lastCommandID = getNextLastCommandID()
      return false
    }
  }


  if( !(nextCommand?.length) )
  {
          nextID = 0
          nextCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${nextID}`);
          // selfMessage(`${linnr39()}: nextID = ${nextID}, g_lastCommandID = ${g_lastCommandID}, nextCommand = ${nextCommand}`);
          g_lastCommandID = nextID;
          // selfMessage(`${linnr40()}: ${g_lastCommandID}' = g_lastCommandID  gui/common/functions_utility~autociv.js`);
          if(!(nextCommand?.length))
            return false
  }

  if(nextCommand?.length){
      g_lastCommand = nextCommand;
      g_lastCommandID = nextID;
      // caption = nextCommand ;
      g_previousCaption = guiObject.caption
      guiObject.caption = nextCommand; // use of guiObject.caption not caption solved a seldom critical crash
      // selfMessage(`${linnr41()}: nextID = ${nextID}, g_lastCommandID = ${g_lastCommandID}, nextCommand = ${nextCommand}`);
      return true;
  }
  // selfMessage('never heppens? 23-0628_1307-15')
  // selfMessage(`775 nextID = ${nextID}, g_lastCommandID = ${g_lastCommandID}, nextCommand = ${nextCommand}`);
  // g_lastCommandID = nextID;
  return false
}



/**
 * Checks if the caption is "communityModToggle" and performs certain actions based on the caption.
 *
 * @param {string} caption - The caption to be checked.
 * @param {boolean} doRestart0ad - Optional parameter to indicate whether to restart 0ad.
 *                                Defaults to false.
 * @return {boolean} Returns true if the caption is "communityModToggle" and
 *                   doRestart0ad is false. Otherwise, returns false.
 */
function captionCheck_is_prettyToggle(caption, doRestart0ad = false){
  if(caption.trim() != "prettyToggle"){
    return;
  }
  // if(gameState == "ingame"){
  //   selfMessage(`prettyToggle is not allowed in ingame.`)
  //   return false
  // }
  // if(!doRestart0ad){
  //   return true
  // }
  const sharpness = Engine.ConfigDB_GetValue(
    "user",
    "sharpness"
  );
  const isPrettyMode = sharpness > 0.1

  if(isPrettyMode){
    prettyGraphicsDisable()
    selfMessage(`pretty mode is disabled.`)
  }else{
    prettyGraphicsEnable()
    selfMessage(`pretty mode is enabled.`)
  }
}

/**
 * Enables pretty graphics settings.
 *
 * @return {void} No return value.
 */
function prettyGraphicsEnable() {
  // Code to enable pretty graphics settings
  // E.g., increase texture quality, enable antialiasing, etc.
  ConfigDB_CreateAndSaveValueA26A27("user", "antialiasing", "msaa8");
//   ConfigDB_CreateAndSaveValueA26A27("user", "fog", "true");
  ConfigDB_CreateAndSaveValueA26A27("user", "max_actor_quality", "150");
  ConfigDB_CreateAndSaveValueA26A27("user", "shadowpcf", "true");
  ConfigDB_CreateAndSaveValueA26A27("user", "shadowquality", "1");
  ConfigDB_CreateAndSaveValueA26A27("user", "shadows", "true");
  ConfigDB_CreateAndSaveValueA26A27("user", "sharpness", "0.14656737446784973");
  ConfigDB_CreateAndSaveValueA26A27("user", "textures.quality", "1");
  ConfigDB_CreateAndSaveValueA26A27("user", "autociv.session.graphics.corpses.max", "10");

}

/**
 * Disables pretty graphics settings.
 *
 * @return {undefined} No return value.
 */
function prettyGraphicsDisable() {
  // Code to disable pretty graphics settings
  // E.g., decrease texture quality, disable antialiasing, etc.
//   ConfigDB_CreateAndSaveValueA26A27("user", "fog", "false");
  ConfigDB_CreateAndSaveValueA26A27("user", "max_actor_quality", "100");
  ConfigDB_CreateAndSaveValueA26A27("user", "shadowpcf", "false");
  ConfigDB_CreateAndSaveValueA26A27("user", "shadowquality", "-1");
  ConfigDB_CreateAndSaveValueA26A27("user", "shadows", "false");
  ConfigDB_CreateAndSaveValueA26A27("user", "sharpness", "0.09461931884288788");
  ConfigDB_CreateAndSaveValueA26A27("user", "textures.quality", "0");
  ConfigDB_CreateAndSaveValueA26A27("user", "autociv.session.graphics.corpses.max", "0");
}



/**
 * Checks if the caption is "communityModToggle" and performs certain actions based on the caption.
 *
 * @param {string} caption - The caption to be checked.
 * @param {boolean} doRestart0ad - Optional parameter to indicate whether to restart 0ad.
 *                                Defaults to false.
 * @return {boolean} Returns true if the caption is "communityModToggle" and
 *                   doRestart0ad is false. Otherwise, returns false.
 */
function captionCheck_is_communityModToggle_optional_restartOad(caption, doRestart0ad = false){
  if(caption.trim() == "communityModToggle"){


    if(gameState == "ingame"){
      selfMessage(`communityModToggle is not allowed in ingame.`)
      return false
    }

    if(!doRestart0ad){
      return true // yes the caption is communityModToggle, but do not restart0ad now
    }


    let modEnabledmods = Engine.ConfigDB_GetValue(
      "user",
      "mod.enabledmods"
    );
    selfMessage(`modEnabledmods = ${modEnabledmods}`);
    if(modEnabledmods.indexOf("community-mod") == -1)
      modEnabledmods += ' community-mod'
    else
      modEnabledmods = modEnabledmods.replace(/\s*\bcommunity-mod\b\s*/, " ")

    ConfigDB_CreateAndSaveValueA26A27("user", "mod.enabledmods", modEnabledmods.trim())
    selfMessage(`modEnabledmods = ${modEnabledmods}`);
    restart0ad()
  }
}







function truncateString(str, num) {
  if (str.length > num) {
    return str.slice(0, num) + "...";
  } else {
    return str;
  }
}


function inputCopySearchReults(chatInput){
  /**
 * when:
 * 1. the tab key is pressed in the chat input.
 * 2. startsWith("s?")
 * 3. cursor is at the beginning of the chat input ==> chat is copied to the chat text
 */
  // warn(`${linnr42()} buffer_position: ${chatInput.buffer_position}`)
  const text = chatInput.caption
  const inFilterMode = text.startsWith("s?")
  if(!inFilterMode)
    return false

  if(text == "s?" && chatInput.buffer_position > 0){
    chatInput.caption += g_selfNick
    return true
  }

  let chatText = Engine.GetGUIObjectByName("chatText")
  if(!chatText){
    // chatText = chatInput // has no list property ingame state
    chatInput.caption = g_chatTextInInputFild_when_msgCommand
    return true
  }

  // warn(`${linnr43()} buffer_position: ${chatInput.buffer_position}`)
  let chatStr = ''
  chatText.list.filter(t => {
    chatStr += t.replace(/\[.*?\]/g, '');
  })
  chatInput.caption = chatStr
  return true
}
/**
 * Simple markup compatible with 0ad strings rendering options.
 */

function autociv_SimpleMarkup(inputText)
{
    return inputText.split("\n").
        filter(l => l.trim().length !== 0).
        map(l => l.replace(/\t/g, "    ")).
        map((line, index) => autociv_SimpleMarkup.makeLine(line, 0, index)).
        join("\n")
}

autociv_SimpleMarkup.escape = function (text)
{
    return text.replace(/\\/g, "\\\\").replace(/\[/g, "\\[")
}

/**
 * Function has no concept of other possible lines (no internal state)
 * Must return valid pyrogenesis text string format
 */
autociv_SimpleMarkup.makeLine = function (input, depth, lineIndex)
{
    let d = (text) => autociv_SimpleMarkup.makeLine(text, depth + 1, lineIndex)
    let grabber = (regex, text) => regex.exec(text).slice(1)
    let [prefix, body] = grabber(/^( *)(.*)$/, input)

    // Title
    if (/^#+ .*$/.test(body) && depth < 2)
    {
        let [hash, text] = grabber(/^(#+) (.*)$/, body)

        let out = size => depth != 0 ?
            `${prefix}[font="sans-bold-${size}"]${d(text)}[/font]` :
            lineIndex == 0 ?
                `${prefix}[font="sans-bold-${size}"]${d(text)}[/font]\n` :
                `\n\n${prefix}[font="sans-bold-${size}"]${d(text)}[/font]\n`;

        switch (hash.length)
        {
            case 1: return out(24)
            case 2: return out(22)
            case 3: return out(20)
            case 4: return out(18)
            case 5: return out(16)
            case 6: return out(14)
            case 7: return out(13)
            default: return out(12)
        }
    }
    // Bullet point
    if (/^- .*$/.test(body) && depth < 2)
    {
        let [slash, text] = grabber(/^(-) *(.*)$/, body)
        return `${prefix}[font="sans-bold-16"]•[/font] ${d(text)}`
    }
    else
    {
        return autociv_SimpleMarkup.escape(`${prefix}${body}`)
    }
}
//Author: https://github.com/farzher/fuzzysort
/*
WHAT: SublimeText-like Fuzzy Search

USAGE:
  fuzzysort.single('fs', 'Fuzzy Search') // {score: -16}
  fuzzysort.single('test', 'test') // {score: 0}
  fuzzysort.single('doesnt exist', 'target') // null

  fuzzysort.go('mr', ['Monitor.cpp', 'MeshRenderer.cpp'])
  // [{score: -18, target: "MeshRenderer.cpp"}, {score: -6009, target: "Monitor.cpp"}]

  fuzzysort.highlight(fuzzysort.single('fs', 'Fuzzy Search'), '<b>', '</b>')
  // <b>F</b>uzzy <b>S</b>earch
*/

var fuzzysort = (function ()
{
    function fuzzysortNew(instanceOptions)
    {

        var fuzzysort = {

            single: function (search, target, options)
            {
                if (!search) return null
                if (!isObj(search)) search = fuzzysort.getPreparedSearch(search)

                if (!target) return null
                if (!isObj(target)) target = fuzzysort.getPrepared(target)

                var allowTypo = options && options.allowTypo !== undefined ? options.allowTypo
                    : instanceOptions && instanceOptions.allowTypo !== undefined ? instanceOptions.allowTypo
                        : true
                var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo
                return algorithm(search, target, search[0])
                // var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991
                // var result = algorithm(search, target, search[0])
                // if(result === null) return null
                // if(result.score < threshold) return null
                // return result
            },

            go: function (search, targets, options)
            {
                if (!search) return noResults
                search = fuzzysort.prepareSearch(search)
                var searchLowerCode = search[0]

                var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991
                var limit = options && options.limit || instanceOptions && instanceOptions.limit || 9007199254740991
                var allowTypo = options && options.allowTypo !== undefined ? options.allowTypo
                    : instanceOptions && instanceOptions.allowTypo !== undefined ? instanceOptions.allowTypo
                        : true
                var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo
                var resultsLen = 0; var limitedCount = 0
                var targetsLen = targets.length

                // This code is copy/pasted 3 times for performance reasons [options.keys, options.key, no keys]

                // options.keys
                if (options && options.keys)
                {
                    var scoreFn = options.scoreFn || defaultScoreFn
                    var keys = options.keys
                    var keysLen = keys.length
                    for (var i = targetsLen - 1; i >= 0; --i)
                    {
                        var obj = targets[i]
                        var objResults = new Array(keysLen)
                        for (var keyI = keysLen - 1; keyI >= 0; --keyI)
                        {
                            var key = keys[keyI]
                            var target = getValue(obj, key)
                            if (!target) { objResults[keyI] = null; continue }
                            if (!isObj(target)) target = fuzzysort.getPrepared(target)

                            objResults[keyI] = algorithm(search, target, searchLowerCode)
                        }
                        objResults.obj = obj // before scoreFn so scoreFn can use it
                        var score = scoreFn(objResults)
                        if (score === null) continue
                        if (score < threshold) continue
                        objResults.score = score
                        if (resultsLen < limit) { q.add(objResults); ++resultsLen }
                        else
                        {
                            ++limitedCount
                            if (score > q.peek().score) q.replaceTop(objResults)
                        }
                    }

                    // options.key
                } else if (options && options.key)
                {
                    var key = options.key
                    for (var i = targetsLen - 1; i >= 0; --i)
                    {
                        var obj = targets[i]
                        var target = getValue(obj, key)
                        if (!target) continue
                        if (!isObj(target)) target = fuzzysort.getPrepared(target)

                        var result = algorithm(search, target, searchLowerCode)
                        if (result === null) continue
                        if (result.score < threshold) continue

                        // have to clone result so duplicate targets from different obj can each reference the correct obj
                        result = { target: result.target, _targetLowerCodes: null, _nextBeginningIndexes: null, score: result.score, indexes: result.indexes, obj: obj } // hidden

                        if (resultsLen < limit) { q.add(result); ++resultsLen }
                        else
                        {
                            ++limitedCount
                            if (result.score > q.peek().score) q.replaceTop(result)
                        }
                    }

                    // no keys
                } else
                {
                    for (var i = targetsLen - 1; i >= 0; --i)
                    {
                        var target = targets[i]
                        if (!target) continue
                        if (!isObj(target)) target = fuzzysort.getPrepared(target)

                        var result = algorithm(search, target, searchLowerCode)
                        if (result === null) continue
                        if (result.score < threshold) continue
                        if (resultsLen < limit) { q.add(result); ++resultsLen }
                        else
                        {
                            ++limitedCount
                            if (result.score > q.peek().score) q.replaceTop(result)
                        }
                    }
                }

                if (resultsLen === 0) return noResults
                var results = new Array(resultsLen)
                for (var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll()
                results.total = resultsLen + limitedCount
                return results
            },

            goAsync: function (search, targets, options)
            {
                var canceled = false
                var p = new Promise(function (resolve, reject)
                {
                    if (!search) return resolve(noResults)
                    search = fuzzysort.prepareSearch(search)
                    var searchLowerCode = search[0]

                    var q = fastpriorityqueue()
                    var iCurrent = targets.length - 1
                    var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991
                    var limit = options && options.limit || instanceOptions && instanceOptions.limit || 9007199254740991
                    var allowTypo = options && options.allowTypo !== undefined ? options.allowTypo
                        : instanceOptions && instanceOptions.allowTypo !== undefined ? instanceOptions.allowTypo
                            : true
                    var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo
                    var resultsLen = 0; var limitedCount = 0
                    function step()
                    {
                        if (canceled) return reject('canceled')

                        var startMs = Date.now()

                        // This code is copy/pasted 3 times for performance reasons [options.keys, options.key, no keys]

                        // options.keys
                        if (options && options.keys)
                        {
                            var scoreFn = options.scoreFn || defaultScoreFn
                            var keys = options.keys
                            var keysLen = keys.length
                            for (; iCurrent >= 0; --iCurrent)
                            {
                                var obj = targets[iCurrent]
                                var objResults = new Array(keysLen)
                                for (var keyI = keysLen - 1; keyI >= 0; --keyI)
                                {
                                    var key = keys[keyI]
                                    var target = getValue(obj, key)
                                    if (!target) { objResults[keyI] = null; continue }
                                    if (!isObj(target)) target = fuzzysort.getPrepared(target)

                                    objResults[keyI] = algorithm(search, target, searchLowerCode)
                                }
                                objResults.obj = obj // before scoreFn so scoreFn can use it
                                var score = scoreFn(objResults)
                                if (score === null) continue
                                if (score < threshold) continue
                                objResults.score = score
                                if (resultsLen < limit) { q.add(objResults); ++resultsLen }
                                else
                                {
                                    ++limitedCount
                                    if (score > q.peek().score) q.replaceTop(objResults)
                                }

                                if (iCurrent % 1000/*itemsPerCheck*/ === 0)
                                {
                                    if (Date.now() - startMs >= 10/*asyncInterval*/)
                                    {
                                        isNode ? setImmediate(step) : setTimeout(step)
                                        return
                                    }
                                }
                            }

                            // options.key
                        } else if (options && options.key)
                        {
                            var key = options.key
                            for (; iCurrent >= 0; --iCurrent)
                            {
                                var obj = targets[iCurrent]
                                var target = getValue(obj, key)
                                if (!target) continue
                                if (!isObj(target)) target = fuzzysort.getPrepared(target)

                                var result = algorithm(search, target, searchLowerCode)
                                if (result === null) continue
                                if (result.score < threshold) continue

                                // have to clone result so duplicate targets from different obj can each reference the correct obj
                                result = { target: result.target, _targetLowerCodes: null, _nextBeginningIndexes: null, score: result.score, indexes: result.indexes, obj: obj } // hidden

                                if (resultsLen < limit) { q.add(result); ++resultsLen }
                                else
                                {
                                    ++limitedCount
                                    if (result.score > q.peek().score) q.replaceTop(result)
                                }

                                if (iCurrent % 1000/*itemsPerCheck*/ === 0)
                                {
                                    if (Date.now() - startMs >= 10/*asyncInterval*/)
                                    {
                                        isNode ? setImmediate(step) : setTimeout(step)
                                        return
                                    }
                                }
                            }

                            // no keys
                        } else
                        {
                            for (; iCurrent >= 0; --iCurrent)
                            {
                                var target = targets[iCurrent]
                                if (!target) continue
                                if (!isObj(target)) target = fuzzysort.getPrepared(target)

                                var result = algorithm(search, target, searchLowerCode)
                                if (result === null) continue
                                if (result.score < threshold) continue
                                if (resultsLen < limit) { q.add(result); ++resultsLen }
                                else
                                {
                                    ++limitedCount
                                    if (result.score > q.peek().score) q.replaceTop(result)
                                }

                                if (iCurrent % 1000/*itemsPerCheck*/ === 0)
                                {
                                    if (Date.now() - startMs >= 10/*asyncInterval*/)
                                    {
                                        isNode ? setImmediate(step) : setTimeout(step)
                                        return
                                    }
                                }
                            }
                        }

                        if (resultsLen === 0) return resolve(noResults)
                        var results = new Array(resultsLen)
                        for (var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll()
                        results.total = resultsLen + limitedCount
                        resolve(results)
                    }

                    isNode ? setImmediate(step) : step()
                })
                p.cancel = function () { canceled = true }
                return p
            },

            highlight: function (result, hOpen, hClose)
            {
                if (result === null) return null
                if (hOpen === undefined) hOpen = '<b>'
                if (hClose === undefined) hClose = '</b>'
                var highlighted = ''
                var matchesIndex = 0
                var opened = false
                var target = result.target
                var targetLen = target.length
                var matchesBest = result.indexes
                for (var i = 0; i < targetLen; ++i)
                {
                    var char = target[i]
                    if (matchesBest[matchesIndex] === i)
                    {
                        ++matchesIndex
                        if (!opened)
                        {
                            opened = true
                            highlighted += hOpen
                        }

                        if (matchesIndex === matchesBest.length)
                        {
                            try {
                                highlighted += char + hClose + target.substr(i + 1)
                            } catch (error) {
                                warn('error:' + error);
                            }
                            break
                        }
                    } else
                    {
                        if (opened)
                        {
                            opened = false
                            highlighted += hClose
                        }
                    }
                    highlighted += char
                }

                return highlighted
            },

            prepare: function (target)
            {
                if (!target) return
                return { target: target, _targetLowerCodes: fuzzysort.prepareLowerCodes(target), _nextBeginningIndexes: null, score: null, indexes: null, obj: null } // hidden
            },
            prepareSlow: function (target)
            {
                if (!target) return
                return { target: target, _targetLowerCodes: fuzzysort.prepareLowerCodes(target), _nextBeginningIndexes: fuzzysort.prepareNextBeginningIndexes(target), score: null, indexes: null, obj: null } // hidden
            },
            prepareSearch: function (search)
            {
                if (!search) return
                return fuzzysort.prepareLowerCodes(search)
            },



            // Below this point is only internal code
            // Below this point is only internal code
            // Below this point is only internal code
            // Below this point is only internal code



            getPrepared: function (target)
            {
                if (target.length > 999) return fuzzysort.prepare(target) // don't cache huge targets
                var targetPrepared = preparedCache.get(target)
                if (targetPrepared !== undefined) return targetPrepared
                targetPrepared = fuzzysort.prepare(target)
                preparedCache.set(target, targetPrepared)
                return targetPrepared
            },
            getPreparedSearch: function (search)
            {
                if (search.length > 999) return fuzzysort.prepareSearch(search) // don't cache huge searches
                var searchPrepared = preparedSearchCache.get(search)
                if (searchPrepared !== undefined) return searchPrepared
                searchPrepared = fuzzysort.prepareSearch(search)
                preparedSearchCache.set(search, searchPrepared)
                return searchPrepared
            },

            algorithm: function (searchLowerCodes, prepared, searchLowerCode)
            {
                var targetLowerCodes = prepared._targetLowerCodes
                var searchLen = searchLowerCodes.length
                var targetLen = targetLowerCodes.length
                var searchI = 0 // where we at
                var targetI = 0 // where you at
                var typoSimpleI = 0
                var matchesSimpleLen = 0

                // very basic fuzzy match; to remove non-matching targets ASAP!
                // walk through target. find sequential matches.
                // if all chars aren't found then exit
                for (; ;)
                {
                    var isMatch = searchLowerCode === targetLowerCodes[targetI]
                    if (isMatch)
                    {
                        matchesSimple[matchesSimpleLen++] = targetI
                        ++searchI; if (searchI === searchLen) break
                        searchLowerCode = searchLowerCodes[typoSimpleI === 0 ? searchI : (typoSimpleI === searchI ? searchI + 1 : (typoSimpleI === searchI - 1 ? searchI - 1 : searchI))]
                    }

                    ++targetI; if (targetI >= targetLen)
                    { // Failed to find searchI
                        // Check for typo or exit
                        // we go as far as possible before trying to transpose
                        // then we transpose backwards until we reach the beginning
                        for (; ;)
                        {
                            if (searchI <= 1) return null // not allowed to transpose first char
                            if (typoSimpleI === 0)
                            { // we haven't tried to transpose yet
                                --searchI
                                var searchLowerCodeNew = searchLowerCodes[searchI]
                                if (searchLowerCode === searchLowerCodeNew) continue // doesn't make sense to transpose a repeat char
                                typoSimpleI = searchI
                            } else
                            {
                                if (typoSimpleI === 1) return null // reached the end of the line for transposing
                                --typoSimpleI
                                searchI = typoSimpleI
                                searchLowerCode = searchLowerCodes[searchI + 1]
                                var searchLowerCodeNew = searchLowerCodes[searchI]
                                if (searchLowerCode === searchLowerCodeNew) continue // doesn't make sense to transpose a repeat char
                            }
                            matchesSimpleLen = searchI
                            targetI = matchesSimple[matchesSimpleLen - 1] + 1
                            break
                        }
                    }
                }

                var searchI = 0
                var typoStrictI = 0
                var successStrict = false
                var matchesStrictLen = 0

                var nextBeginningIndexes = prepared._nextBeginningIndexes
                if (nextBeginningIndexes === null) nextBeginningIndexes = prepared._nextBeginningIndexes = fuzzysort.prepareNextBeginningIndexes(prepared.target)
                var firstPossibleI = targetI = matchesSimple[0] === 0 ? 0 : nextBeginningIndexes[matchesSimple[0] - 1]

                // Our target string successfully matched all characters in sequence!
                // Let's try a more advanced and strict test to improve the score
                // only count it as a match if it's consecutive or a beginning character!
                if (targetI !== targetLen) for (; ;)
                {
                    if (targetI >= targetLen)
                    {
                        // We failed to find a good spot for this search char, go back to the previous search char and force it forward
                        if (searchI <= 0)
                        { // We failed to push chars forward for a better match
                            // transpose, starting from the beginning
                            ++typoStrictI; if (typoStrictI > searchLen - 2) break
                            if (searchLowerCodes[typoStrictI] === searchLowerCodes[typoStrictI + 1]) continue // doesn't make sense to transpose a repeat char
                            targetI = firstPossibleI
                            continue
                        }

                        --searchI
                        var lastMatch = matchesStrict[--matchesStrictLen]
                        targetI = nextBeginningIndexes[lastMatch]

                    } else
                    {
                        var isMatch = searchLowerCodes[typoStrictI === 0 ? searchI : (typoStrictI === searchI ? searchI + 1 : (typoStrictI === searchI - 1 ? searchI - 1 : searchI))] === targetLowerCodes[targetI]
                        if (isMatch)
                        {
                            matchesStrict[matchesStrictLen++] = targetI
                            ++searchI; if (searchI === searchLen) { successStrict = true; break }
                            ++targetI
                        } else
                        {
                            targetI = nextBeginningIndexes[targetI]
                        }
                    }
                }

                { // tally up the score & keep track of matches for highlighting later
                    if (successStrict) { var matchesBest = matchesStrict; var matchesBestLen = matchesStrictLen }
                    else { var matchesBest = matchesSimple; var matchesBestLen = matchesSimpleLen }
                    var score = 0
                    var lastTargetI = -1
                    for (var i = 0; i < searchLen; ++i)
                    {
                        var targetI = matchesBest[i]
                        // score only goes down if they're not consecutive
                        if (lastTargetI !== targetI - 1) score -= targetI
                        lastTargetI = targetI
                    }
                    if (!successStrict)
                    {
                        score *= 1000
                        if (typoSimpleI !== 0) score += -20/*typoPenalty*/
                    } else
                    {
                        if (typoStrictI !== 0) score += -20/*typoPenalty*/
                    }
                    score -= targetLen - searchLen
                    prepared.score = score
                    prepared.indexes = new Array(matchesBestLen); for (var i = matchesBestLen - 1; i >= 0; --i) prepared.indexes[i] = matchesBest[i]

                    return prepared
                }
            },

            algorithmNoTypo: function (searchLowerCodes, prepared, searchLowerCode)
            {
                var targetLowerCodes = prepared._targetLowerCodes
                var searchLen = searchLowerCodes.length
                var targetLen = targetLowerCodes.length
                var searchI = 0 // where we at
                var targetI = 0 // where you at
                var matchesSimpleLen = 0

                // very basic fuzzy match; to remove non-matching targets ASAP!
                // walk through target. find sequential matches.
                // if all chars aren't found then exit
                for (; ;)
                {
                    var isMatch = searchLowerCode === targetLowerCodes[targetI]
                    if (isMatch)
                    {
                        matchesSimple[matchesSimpleLen++] = targetI
                        ++searchI; if (searchI === searchLen) break
                        searchLowerCode = searchLowerCodes[searchI]
                    }
                    ++targetI; if (targetI >= targetLen) return null // Failed to find searchI
                }

                var searchI = 0
                var successStrict = false
                var matchesStrictLen = 0

                var nextBeginningIndexes = prepared._nextBeginningIndexes
                if (nextBeginningIndexes === null) nextBeginningIndexes = prepared._nextBeginningIndexes = fuzzysort.prepareNextBeginningIndexes(prepared.target)
                var firstPossibleI = targetI = matchesSimple[0] === 0 ? 0 : nextBeginningIndexes[matchesSimple[0] - 1]

                // Our target string successfully matched all characters in sequence!
                // Let's try a more advanced and strict test to improve the score
                // only count it as a match if it's consecutive or a beginning character!
                if (targetI !== targetLen) for (; ;)
                {
                    if (targetI >= targetLen)
                    {
                        // We failed to find a good spot for this search char, go back to the previous search char and force it forward
                        if (searchI <= 0) break // We failed to push chars forward for a better match

                        --searchI
                        var lastMatch = matchesStrict[--matchesStrictLen]
                        targetI = nextBeginningIndexes[lastMatch]

                    } else
                    {
                        var isMatch = searchLowerCodes[searchI] === targetLowerCodes[targetI]
                        if (isMatch)
                        {
                            matchesStrict[matchesStrictLen++] = targetI
                            ++searchI; if (searchI === searchLen) { successStrict = true; break }
                            ++targetI
                        } else
                        {
                            targetI = nextBeginningIndexes[targetI]
                        }
                    }
                }

                { // tally up the score & keep track of matches for highlighting later
                    if (successStrict) { var matchesBest = matchesStrict; var matchesBestLen = matchesStrictLen }
                    else { var matchesBest = matchesSimple; var matchesBestLen = matchesSimpleLen }
                    var score = 0
                    var lastTargetI = -1
                    for (var i = 0; i < searchLen; ++i)
                    {
                        var targetI = matchesBest[i]
                        // score only goes down if they're not consecutive
                        if (lastTargetI !== targetI - 1) score -= targetI
                        lastTargetI = targetI
                    }
                    if (!successStrict) score *= 1000
                    score -= targetLen - searchLen
                    prepared.score = score
                    prepared.indexes = new Array(matchesBestLen); for (var i = matchesBestLen - 1; i >= 0; --i) prepared.indexes[i] = matchesBest[i]

                    return prepared
                }
            },

            prepareLowerCodes: function (str)
            {
                var strLen = str.length
                var lowerCodes = [] // new Array(strLen)    sparse array is too slow
                var lower = str.toLowerCase()
                for (var i = 0; i < strLen; ++i) lowerCodes[i] = lower.charCodeAt(i)
                return lowerCodes
            },
            prepareBeginningIndexes: function (target)
            {
                var targetLen = target.length
                var beginningIndexes = []; var beginningIndexesLen = 0
                var wasUpper = false
                var wasAlphanum = false
                for (var i = 0; i < targetLen; ++i)
                {
                    var targetCode = target.charCodeAt(i)
                    var isUpper = targetCode >= 65 && targetCode <= 90
                    var isAlphanum = isUpper || targetCode >= 97 && targetCode <= 122 || targetCode >= 48 && targetCode <= 57
                    var isBeginning = isUpper && !wasUpper || !wasAlphanum || !isAlphanum
                    wasUpper = isUpper
                    wasAlphanum = isAlphanum
                    if (isBeginning) beginningIndexes[beginningIndexesLen++] = i
                }
                return beginningIndexes
            },
            prepareNextBeginningIndexes: function (target)
            {
                var targetLen = target.length
                var beginningIndexes = fuzzysort.prepareBeginningIndexes(target)
                var nextBeginningIndexes = [] // new Array(targetLen)     sparse array is too slow
                var lastIsBeginning = beginningIndexes[0]
                var lastIsBeginningI = 0
                for (var i = 0; i < targetLen; ++i)
                {
                    if (lastIsBeginning > i)
                    {
                        nextBeginningIndexes[i] = lastIsBeginning
                    } else
                    {
                        lastIsBeginning = beginningIndexes[++lastIsBeginningI]
                        nextBeginningIndexes[i] = lastIsBeginning === undefined ? targetLen : lastIsBeginning
                    }
                }
                return nextBeginningIndexes
            },

            cleanup: cleanup,
            new: fuzzysortNew,
        }
        return fuzzysort
    } // fuzzysortNew

    // This stuff is outside fuzzysortNew, because it's shared with instances of fuzzysort.new()
    var isNode = typeof require !== 'undefined' && typeof window === 'undefined'
    var preparedCache = new Map()
    var preparedSearchCache = new Map()
    var noResults = []; noResults.total = 0
    var matchesSimple = []; var matchesStrict = []
    function cleanup() { preparedCache.clear(); preparedSearchCache.clear(); matchesSimple = []; matchesStrict = [] }
    function defaultScoreFn(a)
    {
        var max = -9007199254740991
        for (var i = a.length - 1; i >= 0; --i)
        {
            var result = a[i]; if (result === null) continue
            var score = result.score
            if (score > max) max = score
        }
        if (max === -9007199254740991) return null
        return max
    }

    function getValue(obj, prop)
    {
        var tmp = obj[prop]; if (tmp !== undefined) return tmp
        var segs = prop
        if (!Array.isArray(prop)) segs = prop.split('.')
        var len = segs.length
        var i = -1
        while (obj && (++i < len)) obj = obj[segs[i]]
        return obj
    }

    function isObj(x) { return typeof x === 'object' } // faster as a function

    // Hacked version of https://github.com/lemire/FastPriorityQueue.js
    var fastpriorityqueue = function () { var r = [], o = 0, e = {}; function n() { for (var e = 0, n = r[e], c = 1; c < o;) { var f = c + 1; e = c, f < o && r[f].score < r[c].score && (e = f), r[e - 1 >> 1] = r[e], c = 1 + (e << 1) } for (var a = e - 1 >> 1; e > 0 && n.score < r[a].score; a = (e = a) - 1 >> 1)r[e] = r[a]; r[e] = n } return e.add = function (e) { var n = o; r[o++] = e; for (var c = n - 1 >> 1; n > 0 && e.score < r[c].score; c = (n = c) - 1 >> 1)r[n] = r[c]; r[n] = e }, e.poll = function () { if (0 !== o) { var e = r[0]; return r[0] = r[--o], n(), e } }, e.peek = function (e) { if (0 !== o) return r[0] }, e.replaceTop = function (o) { r[0] = o, n() }, e };
    var q = fastpriorityqueue() // reuse this, except for async, it needs to make its own

    return fuzzysortNew();
})()




class BotManager
{
	list = new Map();
	messageInterface = "ingame";

	constructor()
	{







	}

	addBot(name, object)
	{
		if (!("toggle" in object))
			object.toggle = function () { this.active = !this.active; }

		if (!("react" in object))
			object.react = function () { }

		if (!("load" in object))
			object.load = function () { }

		autociv_patchApplyN(object, "load", function (target, that, args)
		{
			let [active] = args
			that.loaded = true
			that.active = active
			return target.apply(that, args)
		})

		this.list.set(name, object)
	}

	get(name)
	{
		return this.list.get(name)
	}

	sendMessage(text)
	{
		warn("Can't send sendMessage")
	}

	selfMessage(text)
	{
		warn("Can't send selfMessage")
	}

	/**
	 *
	 * @returns {Boolean} - True means to stop message flow
	 */
	react(msg)
	{
		let data = this.pipe(msg)
		if (!data)
			return false

		for (let [name, bot] of this.list)
			if (bot.loaded && bot.active && bot.react(data))
				return true
		return false
	}

	pipe(msg)
	{
		if (!msg)
			return
		return this.pipeWith[this.messageInterface].pipe(msg)
	}

	pipeWith = {
		"lobby": {
			"pipe": function (msg)
			{
				return this.types[msg.type]?.(msg)
			},
			"types":
			{
				"chat": msg =>
				{
					switch (msg.level)
					{
						case "room-message": return {
							"type": "chat",
							"receiver": Engine.LobbyGetNick(),
							"sender": msg.from,
							"message": msg.text
						}
						case "join": return {
							"type": "join",
							"receiver": Engine.LobbyGetNick(),
							"sender": msg.nick,
							"message": ""
						}

					}
				}
			}
		},
		"gamesetup": {
			"pipe": function (msg)
			{
				let bugIt = false // new implementation so i will watch longer
				bugIt = true &&  g_selfNick.includes("seeh") // experimental

				if(msg.guid){
					const chatInput = Engine.GetGUIObjectByName("chatInput")
					if(chatInput && chatInput.caption == ""){
						const nick = splitRatingFromNick(g_PlayerAssignments[msg.guid].name).nick


						const now = new Date();
						const nowMinutes = now.getMinutes();
						const nowEvery30Min = Math.round(nowMinutes / 30) // want message to be sent less often
						// const now = Math.floor(Date.now() / 10000); rounded to the nearest 10 seconds.
						// const now = Math.floor(Date.now() / 100000); rounded to the nearest 100 seconds.
						// const now = Math.floor(Date.now() / 1000000); rounded to the nearest 1000 seconds.
						// const now = Math.floor(Date.now() / 10000000); rounded to the nearest 10000 seconds.
						// 10,000 seconds is approximately 2 hours and 46 minutes.

						if( nick != g_selfNick
							&& !(playerIsGreeted.includes(msg.guid))
							&& !(playerIsGreeted.includes(nowEvery30Min))
							){

							// new implementation so i will watch longer
							// bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer
							// assumtion you are the host and a new plyer did fist think (message or selecint or so)

							const doHelloAutomaticSuggestionWhenJoinAgameSetup = Engine.ConfigDB_GetValue("user", "autocivP.msg.helloAutomaticSuggestionWhenJoinAgameSetup") === "true"

							if(doHelloAutomaticSuggestionWhenJoinAgameSetup){
								chatInput.focus()
								chatInput.caption = (g_IsController) ? `Welcome on board ${nick}. ` : ``

								chatInput.buffer_position = chatInput.caption.length
								if(g_selfNick.includes("seeh")){
									chatInput.caption += 'i ♡ autocivP♇ mod.'
									selfMessage(`${nowEvery30Min} = nowEvery30Min`)
								}


								playerIsGreeted.push(msg.guid);
								playerIsGreeted.push(nowEvery30Min);
								// selfMessage(`you dont want see this message? \n Game > Settings > Options > Personalization > auto hello Suggestion = false`);
							}

						}
					}

				}
				// selfMessage(`${linnr1()}: ${msg.guid} = msg.guid`)
				return this.types[msg.type]?.(msg)
			},
			"types":
			{
				"chat": function (msg)
				{
					// Ignore message if it comes from the AI (will have translate=true)
					if (msg.translate)
						return
					if (Engine.GetPlayerGUID() === undefined ||
						g_PlayerAssignments[Engine.GetPlayerGUID()] === undefined ||
						msg.guid === undefined ||
						g_PlayerAssignments[msg.guid] === undefined)
						return

					return {
						"type": "chat",
						"receiver": splitRatingFromNick(g_PlayerAssignments[Engine.GetPlayerGUID()].name).nick,
						"sender": splitRatingFromNick(g_PlayerAssignments[msg.guid].name).nick,
						"message": msg.text
					}
				}
				// TODO JOIN, LEAVE (AKA newAssignments)
			}
		},
		"ingame": {
			"pipe": function (msg)
			{
				return this.types[msg.type]?.(msg)
			},
			"types":
			{
				"message": function (msg)
				{
					// Ignore message if it comes from the AI (will have translate=true)
					if (msg.translate)
						return
					if (Engine.GetPlayerGUID() === undefined ||
						g_PlayerAssignments[Engine.GetPlayerGUID()] === undefined ||
						msg.guid === undefined ||
						g_PlayerAssignments[msg.guid] === undefined)
						return

					return {
						"type": "chat",
						"receiver": splitRatingFromNick(g_PlayerAssignments[Engine.GetPlayerGUID()].name).nick,
						"sender": splitRatingFromNick(g_PlayerAssignments[msg.guid].name).nick,
						"message": msg.text,
					}
				},
				"rejoined": function (msg)
				{
					if (Engine.GetPlayerGUID() === undefined ||
						g_PlayerAssignments[Engine.GetPlayerGUID()] === undefined ||
						msg.guid === undefined ||
						g_PlayerAssignments[msg.guid] === undefined)
						return

					return {
						"type": "join",
						"receiver": splitRatingFromNick(g_PlayerAssignments[Engine.GetPlayerGUID()].name).nick,
						"sender": splitRatingFromNick(g_PlayerAssignments[msg.guid].name).nick,
						"guid": msg.guid
					}
				}
			}
		}
	}

	setMessageInterface(messageInterface)
	{
		this.messageInterface = messageInterface

		if ("lobby" == this.messageInterface)
		{
			this.sendMessage = text =>
			{
				if (Engine.HasXmppClient())
					Engine.LobbySendMessage(text)
			}

			this.selfMessage = text =>
			{
				const ftext = setStringTags(`== ${text}`, { "font": "sans-bold-13" })
				g_LobbyHandler.lobbyPage.lobbyPage.panels.chatPanel.chatMessagesPanel.
					addText(Date.now() / 1000, ftext)
			}
		}
		else if ("gamesetup" == this.messageInterface)
		{
			this.sendMessage = text =>
			{
				if (Engine.HasNetClient())
					Engine.SendNetworkChat(text)
			}

			this.selfMessage = text =>
			{
				const ftext = setStringTags(`== ${text}`, { "font": "sans-bold-13" })
				g_SetupWindow.pages.GameSetupPage.panels.chatPanel.chatMessagesPanel.
					addText(ftext)
			}
		}
		else if ("ingame" == this.messageInterface)
		{
			this.sendMessage = text =>
			{
				if (Engine.HasNetClient())
				{
					for (let line of text.split("\n"))
						Engine.SendNetworkChat(line)
				}
				else
					// Only used for offline games.
					g_Chat.ChatMessageHandler.handleMessage({
						"type": "message",
						"guid": "local",
						"text": text
					})
			}

			g_Chat.ChatMessageHandler.registerMessageFormat("autociv_self", new ChatMessageFormatAutocivSelf())

			this.selfMessage = text => g_Chat.ChatMessageHandler.handleMessage({
				"type": "autociv_self",
				"text": text
			})
		}
		else
			warn(`Invalid message interface ${this.messageInterface}`)
	}
}

var botManager = new BotManager();

function selfMessage(text) { botManager.selfMessage(text) }

/**
 * Sends a message, splitting it into chunks if necessary.
 *
 * @param {string} text - The message to be sent.
 * @return {undefined} - This function does not return a value.
 */
function sendMessage(text)
{
	// Messages reduced to the first 255 letters so, send it split if exceeded

	if(true){
	// old style:
		const numChunks = Math.ceil(text.length / sendMessage.maxChunkLength);
		for (let i = 0; i < numChunks; ++i)
			botManager.sendMessage(text.substr(i * sendMessage.maxChunkLength, sendMessage.maxChunkLength));
	}else{
		let i = 0;
		const chunk = text.substring(i * sendMessage.maxChunkLength, (i + 1) * sendMessage.maxChunkLength);
		botManager.sendMessage(chunk);
	}
}

sendMessage.maxChunkLength = 256 - 1;

// ********* Bot botManager.addBot order matters ***********

botManager.addBot("playerReminder", {
	"name": `Keeps a diary of notes of each player you've added. Will show it each time they join a match.`,
	"react": function (data)
	{
		if (data.type != "join")
			return;

		if (!this.instance.hasValue(data.sender))
			return;

		selfMessage(`playerReminder => ${data.sender} : ${this.instance.getValue(data.sender)}`);
	},
	"load": function (active)
	{
		this.instance = new ConfigJSON("playerReminder");
	}
});

botManager.addBot("mute", {
	"name": "Mute bot",
	"react": function (data)
	{
		if (data.type != "chat")
			return;

		return this.instance.hasValue(data.sender);
	},
	"load": function (active)
	{
		this.instance = new ConfigJSON(`mute`);
	}
});

botManager.addBot("vote", {
	"name": "Vote bot",
	"toggle": function (votingChoicesText)
	{
		if (votingChoicesText.trim() == "")
		{
			if (!this.active)
			{
				selfMessage(`You need to add choices. e.g  /vote diplo:teams:nomad:wonder`);
				return;
			}
			this.active = false;
			selfMessage("Voting poll closed.")
			return;
		}
		this.active = true;
		this.resetVoting();
		this.voteChoices = votingChoicesText.split(":").slice(0, 7).map(v => v.trim());
		this.printVoting();
	},
	"playerVote": {/* "playerName" : 1 ... */ },
	"voteChoices": [/* "regi", "nomad", ... */],
	"list": "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
	"resetVoting": function ()
	{
		this.playerVote = {};
	},
	"printVoting": function ()
	{
		let choicesCount = new Array(this.voteChoices.length).fill(0);
		for (let key in this.playerVote)
			choicesCount[this.playerVote[key]] += 1;

		let show = (v, i) => `\n    ${choicesCount[i]}           ${this.list[i]}         ${v} `;
		sendMessage(`\nVotes  Option   ${this.voteChoices.map(show).join("")}`)
	},
	"react": function (data)
	{
		if (data.type != "chat")
			return;

		let choice = data.message.trim().toUpperCase();
		if (choice.length != 1)
			return;

		let index = this.list.indexOf(choice);
		if (this.voteChoices[index] === undefined)
			return;

		let oldVote = this.playerVote[data.sender];
		if (oldVote === index)
			return;

		this.playerVote[data.sender] = index;
		this.printVoting();
	}
});

botManager.addBot("autociv", {
	"name": "AutoCiv bot",
	"fuzzySearch": { /* Will be populated with a FuzzySet instance for each civ code on load*/ },
	// Returns returns the civ code if civ name is found, otherwise undefined
	"searchForCivInText": function (text)
	{
		// Lazy load
		if (!this.generateFuzzySearcher.loaded)
			this.generateFuzzySearcher();

		for (let id in this.fuzzySearch)
		{
			let res = this.fuzzySearch[id].get(text, false, 0.7);
			if (!res)
				continue;

			// Check two first letters match
			let t1 = text.slice(0, 2).toLowerCase();
			if (typeof res[0][1] != "string")
				continue
			let t2 = res[0][1].slice(0, 2).toLowerCase();
			if (t1 == t2)
				return id;
		}
	},
	"react": function (data)
	{
		if (data.type != "chat")
			return;


		let bugIt = false // debug session
		// doDebug = true // debug session

		// bugIt = true && g_selfNick =="seeh" // new implementation so i will watch longer



		// var g_selfNick = Engine.ConfigDB_GetValue("user", `playername.multiplayer`);
		// warn(`var g_selfNick = ${g_selfNick} gui/common/botmanager.js:396`)

		const clean = text =>
		{

			// Ignore if text is player name only (to avoid boring content)
			if(text != g_selfNick){
				/*!SECTION
				The length of 0 A.D. user names can vary, but they typically have a minimum length of 3 characters and a maximum length of 25 characters.
				*/

				if(bugIt){
					// selfMessage(`text: ${text} gui/common/botmanager.js:${linnr2()}`)
				}

				// check if a variable text contains a single space character repeated exactly twice (without any additional spaces in between) anywhere in the string
				 // only longer texts are probably intersting (longer then user names. ao less missunderstandings)

				/*!SECTION
				usernames could have:
				- 2 letters and
				- 3 number and
				- differnz length.

				no spaces inside ? right =
				*/
				const isWithTwoSpacesSomewhere = /\b(\S+)\s(\S+)\s\1\s\2\b/.test(text)
				const isWithOneSpaces = /\s+/.test(text)

				if ( false
					|| isWithTwoSpacesSomewhere
					|| (isWithOneSpaces && text.length > 5)
					|| text.length > 18){
					if(Engine.ConfigDB_GetValue("user", "autocivP.chat.copyAllChatMessages") !== "true" )
						g_chatTextInInputFild_when_msgCommand = ''

					g_chatTextInInputFild_when_msgCommand += `${text}\n`
					g_chatTextInInputFild_when_msgCommand_lines++

					// selfMessage(`text: ${text} gui/common/botmanager.js:${linnr3()}`)
				}
			}
			// selfMessage(`text: ${text} gui/common/botmanager.js:${linnr4()}`)
			return text.trim().split(" ")[0].toLowerCase();
		} // end-of-clean function




		// if(doDebug)
		// 	warn(`clean: ${clean} gui/common/botmanager.js:396`)
		if(bugIt){
			const debugMsg = `g_text: ${g_chatTextInInputFild_when_msgCommand} gui/common/botmanager.js:396`
			selfMessage(`${debugMsg}`)
		}

		const firstWord = clean(data.message);
		// const firstWord = 'Gauls';

		// Ignore if text is player name (to avoid similarity with civ names)
		if (game.get.players.name().some(name => firstWord == clean(name)))
			return;



		// Special case: spec makes a player observer.
		if (firstWord == "spec")
		{
			game.set.player.observer(data.sender);
			return;
		}

		// Special case: play makes a player take a free slot.
		if (
			firstWord == "play" &&
			Engine.ConfigDB_GetValue("user", "autociv.gamesetup.play.enabled") == "true"
		)
		{
			game.set.player.play(data.sender);
			return;
		}

		if (firstWord.length < 3) // Ignore if less than 3 char
			return;

		game.set.player.civ(data.sender, this.searchForCivInText(firstWord));
	},
	"generateFuzzySearcher": function ()
	{
		/**
		 * customNamesCivs: Mod independent (ignores civs not in current
		 * enabled mod).
		 * Loaded from file "moddata/autociv_civilizations.json".
		 * You can add any new civ code name you want from any civ you made.
		 * E.g. if you make a new civ called "FoobarCiv", then your civ
		 * code will be "foo" and the possible entries ["foo"(civ code
		 * added automatically, no need to add), "custom name 1", "custom
		 * name 2", "custom name N"].
		 * Doesn't care if uppercase or lowercase for custom name entries
		 * (but does for the civ code).
		 */

		// Load custom civ names.
		let customNamesCivs = Engine.ReadJSONFile("moddata/autociv_civilizations.json");

		// Clear and fill this.fuzzySearch
		this.generateFuzzySearcher.loaded = true;
		this.fuzzySearch = {}

		const randomCivData = {
			"Name": translateWithContext("civilization", "Random"),
			"Code": "random"
		}

		for (let civ of [randomCivData, ...Object.values(g_CivData)])
		{
			// Official full name (translated).
			const civNameVariations = [civ.Name]; // code is shorter string. e.g. "Code":"sele"

			// Custom names if any.
			if (civ.Code in customNamesCivs)
				civNameVariations.push(...customNamesCivs[civ.Code]);

			this.fuzzySearch[civ.Code] = FuzzySet(civNameVariations, true, 3, 3)
		}


	}
});

botManager.addBot("link", {
	"name": "Text link grabber bot",
	"linkList": [],
	"parseURLs": function (text)
	{
		// https://www.regexpal.com/93652
		return text.match(/(sftp:\/\/|ftp:\/\/|http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?/gmi);
	},
	"findAndAdd": function (text)
	{
		let urls = this.parseURLs(text);
		if (urls != null)
			this.linkList.unshift(...urls.reverse())
	},
	"openLink": function (text)
	{
		let i = parseInt(typeof text != "string" ? text : text.trim() != "" ? text : 0);
		if (!Number.isInteger(i) || !this.linkList[i])
			return "No links or invalid index.";

		let url = String(this.linkList[i]);

		// If the URL doesn't have a protocol prefix the game crashes :S
		if (!/(https?|ftp):.*/i.test(url))
			url = "http://" + url.trim();

		Engine.OpenURL(url);
	},
	// Returns pretty info list of all links
	"getInfo": function ()
	{
		let title = `Detected (${this.linkList.length}) links`;
		let textList = this.linkList.map((link, index) => `${index} : ${link}`).reverse()
		return [title].concat(textList).join("\n");
	},
	"react": function (data)
	{
		if (data.type != "chat")
			return;

		this.findAndAdd(data.message);
	}
});
/**
 * Returns the nickname without the lobby rating.
 * This function is used in fgod and is buggy - I ask for fix fpre but he is reluctant  so at least anyone with this mode will not have any issue to see player in gamelist if changed rating to anything
 */
function splitRatingFromNick(playerName)
{
	//let result = /^(\S+)\ \((\d+)\)$/g.exec(playerName);
	//go2die - here fixing the selection of user with rating so in bracket can be anything instead of expected number
	let result = /^(\S+)\ \((.*)\)$/g.exec(playerName);
	return { "nick": result ? result[1] : playerName, "rating": result ? +result[2] : "" };
}
g_NetworkCommands['/help'] = () =>
{
    const g_ChatCommandColor = "200 200 255";
    let text = translate("Chat commands:");
    for (let command in g_NetworkCommands)
    {
        let noSlashCommand = command.slice(1);
        const nc = g_NetworkCommands[command];
        const asc = g_autociv_SharedCommands[noSlashCommand]
        text += "\n" + sprintf(translate("%(command)s - %(description)s"), {
            "command": "/" + coloredText(noSlashCommand, g_ChatCommandColor),
            "description": nc.description || asc && asc.description || ""
        });
    }
    selfMessage(text);
}
// See lobby~autociv.js init function for examples.
class ResizeBar
{
	constructor(object, side, width = 14, objectsHooked = [], isVisibleCondition = () => !this.object.hidden)
	{
		this.object = this.parseObject(object)
		this.side = side
		this.halfWidth = width / 2
		this.objectsHooked = objectsHooked.map(object => [this.parseObject(object[0]), object[1]])
		this.isVisibleCondition = isVisibleCondition
		this.wasMouseInside = false
		this.selectionOffset = 0
	}

	static get bar()
	{
		return ResizeBar._bar ?? (ResizeBar._bar = Engine.GetGUIObjectByName("glResizeBar"))
	}

	static mouse = {
		"x": 0,
		"y": 0,
		"set": function (mouse)
		{
			this.x = mouse.x
			this.y = mouse.y
		}
	}

	static mousePress = { ...ResizeBar.mouse }

	// Holds ResizeBar instance of the bar that is being dragged
	static dragging = undefined

	// Used to disable bar selection while the resize animation is happening.
	static ghostMode = false

	parseObject(object)
	{
		return typeof object == "string" ? Engine.GetGUIObjectByName(object) : object
	}

	isMouseInside()
	{
		if (!this.isVisibleCondition())
			return false

		let rect = this.object.getComputedSize()
		let pos = ResizeBar.mouse
		switch (this.side)
		{
			case "left":
			case "right":
				return Math.abs(rect[this.side] - pos.x) <= this.halfWidth &&
					rect.top + this.halfWidth < pos.y &&
					rect.bottom - this.halfWidth > pos.y
			case "top":
			case "bottom":
				return Math.abs(rect[this.side] - pos.y) <= this.halfWidth &&
					rect.left + this.halfWidth < pos.x &&
					rect.right - this.halfWidth > pos.x
			default:
				return false
		}
	}

	/**
	 * Returns the complementary parameter.
	 */
	sideComplementary(side = this.side)
	{
		switch (side)
		{
			case "left": return "right"
			case "right": return "left"
			case "top": return "bottom"
			case "bottom": return "top"
		}
	}

	/**
	 * Returns the opposite parameter.
	 */
	sideOpposite(side = this.side)
	{
		switch (side)
		{
			case "left": return "top"
			case "top": return "left"
			case "right": return "bottom"
			case "bottom": return "right"
		}
	}

	/**
	 * Returns the opposite and complementary parameter.
	 */
	sideCrossed(side = this.side)
	{
		return this.sideComplementary(this.sideOpposite(side))
	}

	sideSign(side = this.side)
	{
		switch (side)
		{
			case "right":
			case "bottom":
				return +1
			default:
				return -1
		}
	}

	sideMouse(side = this.side)
	{
		switch (side)
		{
			case "left":
			case "right":
				return "x"
			default:
				return "y"
		}
	}

	getBarSizes()
	{
		let absPos = this.object.getComputedSize()
		return {
			"open": {
				[this.side]: absPos[this.side] + this.sideSign() * this.halfWidth,
				[this.sideComplementary()]: absPos[this.side] - this.sideSign() * this.halfWidth,
				[this.sideOpposite()]: absPos[this.sideOpposite()],
				[this.sideCrossed()]: absPos[this.sideCrossed()]
			},
			"closed": {
				[this.side]: absPos[this.side],
				[this.sideComplementary()]: absPos[this.side],
				[this.sideOpposite()]: absPos[this.sideOpposite()],
				[this.sideCrossed()]: absPos[this.sideCrossed()]
			}
		}
	}

	viewResizeBar()
	{
		let sizes = this.getBarSizes()
		animate(ResizeBar.bar).finish().add({
			"start": { "size": sizes.closed },
			"size": sizes.open,
			"onStart": bar => bar.hidden = false
		})
	}

	hideResizeBar()
	{
		let sizes = this.getBarSizes()
		animate(ResizeBar.bar).finish().add({
			"start": { "size": sizes.open },
			"size": sizes.closed,
			"onComplete": bar => bar.hidden = true
		})
	}

	tick()
	{
		if (ResizeBar.dragging === this)
		{
			let position = ResizeBar.mouse[this.sideMouse()] - this.selectionOffset
			let absPos = this.object.getComputedSize()

			ResizeBar.bar.size = Object.assign(ResizeBar.bar.size, {
				[this.side]: position + this.sideSign() * this.halfWidth,
				[this.sideComplementary()]: position - this.sideSign() * this.halfWidth,
				[this.sideOpposite()]: absPos[this.sideOpposite()],
				[this.sideCrossed()]: absPos[this.sideCrossed()]
			})
			return true
		}
		else if (!ResizeBar.dragging)
		{
			let isInside = this.isMouseInside()
			if (isInside && this.wasMouseInside && ResizeBar.bar.hidden)
				this.viewResizeBar()

			if (this.wasMouseInside == isInside)
				return isInside

			if (isInside)
				this.viewResizeBar()
			else
				this.hideResizeBar()

			this.wasMouseInside = isInside
			return isInside
		}
		return false
	}

	drag()
	{
		if (!this.isMouseInside())
			return false

		ResizeBar.mousePress.set(ResizeBar.mouse)
		ResizeBar.dragging = this
		this.selectionOffset = ResizeBar.mousePress[this.sideMouse()] - this.object.getComputedSize()[this.side]
		return true
	}

	drop()
	{
		if (ResizeBar.dragging !== this)
			return false

		let displacement = ResizeBar.mouse[this.sideMouse()] - ResizeBar.mousePress[this.sideMouse()]
		if (displacement)
		{
			ResizeBar.ghostMode = true
			animate(this.object).add({
				"size": { [this.side]: this.object.size[this.side] + displacement },
				"onComplete": () => ResizeBar.ghostMode = false
			})
			for (let [object, side] of this.objectsHooked)
				animate(object).add({
					"size": { [side]: object.size[side] + displacement }
				})
		}

		ResizeBar.dragging = undefined
		return true
	}
}

/**
 * Manages and creates a resize bars for an GUIObject.
 *
 * Example: (lobby.js)
 *
 * g_resizeBarManager.add(
 *	Engine.GetGUIObjectByName("chatPanel"),
 *	"left",
 *	20,
 *	[
 *		[Engine.GetGUIObjectByName("profilePanel"), "right"],
 *		[Engine.GetGUIObjectByName("leftButtonPanel"), "right"],
 *	],
 *	() => !Engine.GetGUIObjectByName("profilePanel").hidden,
 *	() => warn("chatPanel resized")
 * )
 *
 */
var g_resizeBarManager = new class
{
	// Used to temporary disable all resize bars
	ghostMode = false
	disabled = false
	list = []

	/**
	 * @param {GUIObject} object Main XML object to resize.
	 * @param {String} side Object side to resize: "left", "right", "top", "bottom".
	 * @param {Number} [width] Resize bar width, undefined value will assign the
	 * default width.
	 * @param {Array[]} [objectsHooked] Other XML objects that will also resize with
	 * the main XML object.
	 * In the form of [[GUIObject1,side1],[GUIObject2,side2],...]
	 * @param {Function} [isVisibleCondition] Condition that makes the resize bar
	 * visible/enabled if it returns true. By default the condition is the property
	 * hidden of the main XML object, visible/enabled if not hidden.
	 */
	add(object, side, width, objectsHooked, isVisibleCondition)
	{
		this.list.push(new ResizeBar(object, side, width, objectsHooked, isVisibleCondition))
		this.disabled = Engine.ConfigDB_GetValue("user", "autociv.resizebar.enabled") != "true"
	}

	onEvent(event)
	{
		if (this.disabled || this.ghostMode || !ResizeBar.bar)
			return

		switch (event.type)
		{
			case "mousebuttondown":
				ResizeBar.mouse.set(event)
				for (let bar of this.list)
					if (bar.drag()) return true
				break
			case "mousebuttonup":
				ResizeBar.mouse.set(event)
				for (let bar of this.list)
					if (bar.drop()) return true
				break
			case "mousemotion":
				ResizeBar.mouse.set(event)
				break
		}
	}

	// Tick routine always called on all pages with global.xml included (all?).
	onTick()
	{
		if (this.disabled || this.ghostMode)
			return

		if (!ResizeBar.ghostMode)
			for (let bar of this.list)
				if (bar.tick())
					break
	}

}()

/* THIS NEEDS TO BE ADDED ON FILES WHERE YOU WANT TO USE RESIZE BARS
	function handleInputBeforeGui(ev)
	{
		g_resizeBarManager.onEvent(ev)
		return false
	}
*/
AnimateGUIObject.types.size = {
	"parameters": deepfreeze(["left", "top", "right", "bottom", "rleft", "rtop", "rright", "rbottom"]),
	"set": (GUIObject, object) => GUIObject.size = object,
	"get": GUIObject => GUIObject.size,
	"fromString": function (text)
	{
		let size = {};
		let blocks = text.match(/[\d%\.\+\-]+/g);
		for (let i = 0; i < 4; ++i)
		{
			let block = blocks[i].split("%");
			if (block.length == 2)
			{
				size[this.parameters[i + 4]] = +block[0];
				size[this.parameters[i]] = +block[1];
			}
			else
				size[this.parameters[i]] = +block[0];
		};
		return size;
	},
	"fromObject": object => Object.assign({}, object),
};
AnimateGUIObject.types.textcolor = {
	"parameters": AnimateGUIObject.types.color.parameters,
	"set": function (GUIObject, object)
	{
		GUIObject.textcolor = this.toString(object);
	},
	"get": GUIObject => Object.assign({ "a": 1 }, GUIObject.textcolor),
	"fromString": AnimateGUIObject.types.color.fromString,
	"fromObject": AnimateGUIObject.types.color.fromObject,
	"toString": AnimateGUIObject.types.color.toString
};
/**
 * Returns a new list filtered and sorted by the similarity with the input text
 * Order of sorting:
 * 1. Exact match
 * 2. Exact lowercase match
 * 3. Starting letters match and sorted alphabetically
 * 4. By similarity score (lookahead match)
 * 5. Entry is discarded if one of the previous don't apply
 *
 * @param {string} input text to search for
 * @param {string[] | object[]} list
 * @param {string} [key] text to use if the list is made up of objects
 */
function autociv_matchsort(input, list, key = null)
{
    let Linput = input.toLowerCase();

    let result = [];

    for (let obj of list)
    {
        let text = key == null ? obj : obj[key];
        let score = autociv_matchsort.scoreText(Linput, text);
        if (score !== undefined)
            result.push([obj, score, text, text.startsWith(input)])
    }

    result.sort(([o1, s1, t1, a1], [o2, s2, t2, a2]) =>
    {
        if (a1 && a2)
            return t1.localeCompare(t2);
        else if (a1)
            return -1;
        else if (a2)
            return 1;

        return s1 - s2;
    });
    return result.map(v => v[0]);
};

// The lower the score the better the match
autociv_matchsort.scoreText = function (input, text)
{
    // Exact match
    if (input == text)
        return -10E7;

    text = text.toLowerCase();

    // Exact match relaxed
    if (input == text)
        return -10E7/2;

    let score = 0;
    let offset = -1;
    for (let i = 0; i < input.length; i++)
    {
        let char = input[i];

        let offsetNext = text.indexOf(char, offset + 1);
        // No match
        if (offsetNext == -1)
            return undefined;

        // Lower score increase if consecutive index
        let isConsecutive = offsetNext == offset + 1 ? 0 : 1;
        score += offsetNext + isConsecutive * offsetNext;
        offset = offsetNext;
    }
    return score;
};
/**
 * @param {Object} [prefix]
 * @param {String} method
 * @param {Function} patch
 */
function autociv_patchApplyN()
{
    if (arguments.length < 2)
    {
        let error = new Error("Insufficient arguments to patch: " + arguments[0]);
        warn(error.message)
        warn(error.stack)
        return;
    }

    let prefix, method, patch;
    if (arguments.length == 2)
    {
        prefix = global;
        method = arguments[0];
        patch = arguments[1];
    }
    else
    {
        prefix = arguments[0];
        method = arguments[1];
        patch = arguments[2];
    }

    if (!(method in prefix))
    {
        const error = new Error("Function not defined: " + method);
        warn(error.message)
        warn(error.stack)
        return;
    }

    prefix[method] = new Proxy(prefix[method], { apply: patch });
}

if (!hotkeySort.specialKeys)
{
    hotkeySort = function (a, b)
    {
        // Quick hack to put those first.
        if (hotkeySort.specialKeys.includes(a))
            a = ' ' + a;
        if (hotkeySort.specialKeys.includes(b))
            b = ' ' + b;
        return a.localeCompare(b, Engine.GetCurrentLocale().substr(0, 2), { "numeric": true });
    }
    hotkeySort.specialKeys = ["Shift", "Alt", "Ctrl", "Super"]
}

hotkeySort.specialKeys.push("Space")
class AnimateGUIObject
{
	constructor(GUIObject, settings)
	{
		this.GUIObject = GUIObject
		this.settings = deepfreeze(settings)

		this.data = AnimateGUIObject.getData(this.settings)
		this.startValues = AnimateGUIObject.getValues(this.settings.start ?? {})
		this.endValues = AnimateGUIObject.getValues(this.settings)
		this.actions = AnimateGUIObject.getActions(this.settings)
		this.tasks = {} // Filled in stageStart

		this.stages = [
			this.stageInit,
			this.stageDelay,
			this.stageStart,
			this.stageTick,
			this.stageComplete
		]
		this.stage = this.stages[0]
	}

	static defaults = {
		"duration": 200,
		"curve": "easeOutQuint",
		"delay": 0,
		"queue": false
	}

	static curves = {
		"linear": x => x,
		"easeInOut": x => x * x * x * (x * (x * 6 - 15) + 10),
		"easeInSine": x => 1 - Math.cos(x * Math.PI / 2),
		"easeOutSine": x => Math.sin(x * Math.PI / 2),
		"easeInQuint": x => Math.pow(x, 5),
		"easeOutQuint": x => 1 - Math.pow(1 - x, 5)
	}

	/**
	 * Specialized methods for each type (size, color, textcolor, ...)
	 * Each defined in its animateGUIObject_*.js
	 */
	static types = {}

	static getData(raw)
	{
		let data = {}
		for (let v in AnimateGUIObject.defaults)
			data[v] = clone(raw[v] ?? AnimateGUIObject.defaults[v])

		// Curve input can be string or function and is outputted as function
		data.curve = AnimateGUIObject.curves[data.curve] || data.curve

		return data
	}

	static getValues(raw)
	{
		let values = {}
		for (let type in AnimateGUIObject.types) if (type in raw)
			values[type] = typeof raw[type] == "object" ?
				AnimateGUIObject.types[type].fromObject(raw[type]) :
				AnimateGUIObject.types[type].fromString(raw[type])

		return values
	}

	static getActions(raw)
	{
		return {
			"onStart": raw.onStart ?? function () { },
			"onTick": raw.onTick ?? function () { },
			"onComplete": raw.onComplete ?? function () { },
		}
	}

	static getTask(raw, type, GUIObject)
	{
		let task = { "parameters": {} }
		let identity = AnimateGUIObject.types[type]
		let original = identity.get(GUIObject)

		for (let parameter of identity.parameters) if (parameter in raw)
		{
			let start = original[parameter]
			let end = raw[parameter]
			task.parameters[parameter] = x => start + x * (end - start)
		}

		task.calc = x =>
		{
			let object = identity.get(GUIObject)
			for (let parameter in task.parameters)
				object[parameter] = task.parameters[parameter](x)
			identity.set(GUIObject, object)
		}

		return task
	}

	static getTasks(raw, GUIObject)
	{
		let tasks = {}
		for (let type in AnimateGUIObject.types) if (type in raw)
			tasks[type] = AnimateGUIObject.getTask(raw[type], type, GUIObject)

		return tasks
	}

	static setValues(values, GUIObject)
	{
		for (let type in values)
		{
			let object = AnimateGUIObject.types[type].get(GUIObject)
			for (let parameter in values[type])
				object[parameter] = values[type][parameter]
			AnimateGUIObject.types[type].set(GUIObject, object)
		}
	}

	run(time)
	{
		while (this.stage?.(time))
			this.stage = this.stages.shift()

		return this
	}

	hasRemainingStages()
	{
		return !!this.stage
	}

	stageInit(time)
	{
		this.data.start = time + this.data.delay
		this.data.end = this.data.start + this.data.duration

		return true
	}

	stageDelay(time)
	{
		return time >= this.data.start
	}

	stageStart(time)
	{
		AnimateGUIObject.setValues(this.startValues, this.GUIObject)
		// delete this.startValues
		this.actions.onStart(this.GUIObject, this)
		this.tasks = AnimateGUIObject.getTasks(this.endValues, this.GUIObject)
		// delete this.endValues

		return true
	}

	stageTick(time)
	{
		let running = time < this.data.end
		let unitary = running ? (time - this.data.start) / this.data.duration : 1
		let x = this.data.curve(unitary)

		if (!this.noTasksUpdate) for (let type in this.tasks)
			this.tasks[type].calc(x)

		this.actions.onTick(this.GUIObject, this)

		return !running
	}

	stageComplete(time)
	{
		this.actions.onComplete(this.GUIObject, this)

		return true
	}

	/**
	 * Checks if the animation has any task that still modifies the GUIObject.
	 */
	isAlive()
	{
		return !!Object.keys(this.tasks).length
	}

	/**
	 * Removes types/tasks that the old animation has with the new animation.
	 */
	removeIntersections(newAnimation)
	{
		for (let type in this.tasks) if (type in newAnimation.endValues)
			this.removeValueIntersections(newAnimation, type)

		return this
	}

	removeValueIntersections(newAnimation, type)
	{
		for (let parameter in this.tasks[type])
			if (parameter in newAnimation.endValues[type])
				delete this.tasks[type][parameter]

		if (!Object.keys(this.tasks[type]).length)
			delete this.tasks[type]
	}

	/**
	 * Jump to the end of the animation.
	 * onStart/onTick/onComplete behaviour doesn't change.
	 * @param {Boolean} noTasksUpdate Ends animations without updating tasks.
	 */
	complete(noTasksUpdate = false)
	{
		this.noTasksUpdate = noTasksUpdate
		this.data.end = Date.now()

		return this
	}
}

function GUIObjectSet(object, settings)
{
	let values = AnimateGUIObject.getValues(settings)
	const GUIObject = typeof object == "string" ? Engine.GetGUIObjectByName(object) : object
	AnimateGUIObject.setValues(values, GUIObject)

	return GUIObject
}
/**
 * GUI animator addon
 * Use:
 *  animate(GUIObject).add(settings)
 *  animate(GUIObject).chain(chainSettingsList, [defaultSettings])
 *  animate(GUIObject).complete().add(setting).chain([...],{"queue":true})
 *	etc ...
 *
 *  · Methods can be chained
 *
 * 	Example of settings:
 *  {
 * 	  "start"     : { "color": ... , "textcolor": ... , "size": ... }
 *	  "color"     : "255 255 255 12",
 *	  "color"     : { "r": 255, "g": 255, "b": 255, "a": 12 },
 *	  "textcolor" : "140 140 140 28",
 *	  "textcolor" : { "r": 140, "g": 140, "b": 140, "a": 28 },
 *	  "size"      : "rleft%left rtop%top rright%right rbottom%bottom",
 *	  "size"      : { "left" : 0,  "top" : 10, "right" : 250, "bottom" : 300,
 *	                  "rleft": 50, "rtop": 50, "rright": 50,  "rbottom": 100 },
 *	  "duration"  : 1000,
 *	  "delay"     : 100,
 *	  "curve"     : "linear",
 *	  "curve"     : x => x*x*x - 1,
 *	  "onStart"   : GUIObject => warn("animation has started"),
 *	  "onTick"    : GUIObject => warn("animation has ticked"),
 *	  "onComplete": GUIObject => warn("animation has completed"),
 *	  "queue"     : false
 *	};
 *
 * · "textcolor" only works if object has caption.
 * · "color" only works if object has a defined sprite = "color: R G B A" in the XML.
 * · "size" always works.
 *
 * · AnimateGUIObject.default for defaults that can be changed.
 * · AnimateGUIObject.curves for animations normalized step functions
 *
 * · Each setting can be set independent (including individual parameters).
 * · In case of two animations with the same setting the new animation
 *   setting will overwrite the old one.
 */

class AnimateGUIManager
{
	objects = new Set()

	get(GUIObject)
	{
		if (!GUIObject.onAutocivAnimate)
		{
			GUIObject.onAutocivAnimate = function () { }
			GUIObject.onAutocivAnimate.manager = new AnimateGUIObjectManager(GUIObject, this)
		}
		this.objects.add(GUIObject.onAutocivAnimate.manager)
		return GUIObject.onAutocivAnimate.manager
	}

	// Adds GUIObjectManager instance back to this.objects so it can onTick again
	setTicking(AnimateGUIObjectManagerInstance)
	{
		this.objects.add(AnimateGUIObjectManagerInstance)
	}

	onTick()
	{
		for (let object of this.objects)
			if (!object.onTick().isAlive())
				this.objects.delete(object)
	}
}

/**
 * @param {object | string} object
 * @returns {AnimateGUIObjectManager} instance
 */
function animate(object)
{
	let GUIObject = typeof object == "string" ? Engine.GetGUIObjectByName(object) : object
	return animate.instance.get(GUIObject)
}

animate.instance = new AnimateGUIManager()

// onTick routine always called on all pages with global.xml included (all?)
animate.onTick = function () { animate.instance.onTick() }
var gameState = "lobby"; // Initial state // // TODO: howto set it like this? g_GameData = data // 	g_GameData.gui.isInGame

var g_selfIsHost

let playerIsGreeted = []

/**
 * Determine if the current player is the host player.
 */
function isSelfHost(){ // maybe call it in a settimeout assync function

	let bugIt = false // new implementation so i will watch longer

	if(bugIt)
		selfMessage(`15: isSelfHost() gui/common/~autocivSharedCommands.js`);
	if(g_selfIsHost === true || g_selfIsHost === false){
		if(bugIt)
			selfMessage(`18: g_selfInHost = ${g_selfIsHost} , gui/common/~autocivSharedCommands.js`);
		return g_selfIsHost;
	}
	switch (typeof g_selfIsHost) {
		case 'undefined':
			if(bugIt)
				selfMessage(`24: g_selfInHost = undefined gui/common/~autocivSharedCommands.js`);
			break;
		default:
			if(bugIt)
				selfMessage(`28: g_selfInHost return  gui/common/~autocivSharedCommands.js`);
			error(`148: g_selfInHost return  gui/common/~autocivSharedCommands.js`);
			return
	}
	// selfMessage(`g_selfInHost: ${g_selfInHost}`);
	const selfGUID = Engine.GetPlayerGUID()

	if (typeof g_PlayerAssignments === 'undefined') {
		return false
	}

	const firstPlayerGUID = Object.keys(g_PlayerAssignments)[0];

	const selfPlayerAssignment = g_PlayerAssignments[Engine.GetPlayerGUID()];
	const hostPlayerAssignment = g_PlayerAssignments[firstPlayerGUID];

	bugIt = true && g_selfNick =="seeh" // new implementation so i will watch longer
	let selfIsHost_temp = selfGUID == firstPlayerGUID;

	if(bugIt){ //NOTE -developers want to see the error in the console
		warn(`42: selfPlayerAssignment.name = ${selfPlayerAssignment.name}`);
		warn(`43: hostPlayerAssignment.name = ${hostPlayerAssignment.name}`);
		warn(`44: g_selfInHost =====> ${selfIsHost_temp} ${selfIsHost_temp} ${selfIsHost_temp} ${selfIsHost_temp} ${selfIsHost_temp}`);
		warn(`45: g_selfInHost => ${selfIsHost_temp}`);
		warn(`45: g_IsController => ${g_IsController}`);

		if(selfIsHost_temp != g_IsController){
			let bugIt = false // new implementation so i will watch longer
			bugIt = true && g_selfNick =="seeh" // new implementation so i will watch longer
			if(bugIt){
				error(`g_IsController != selfIsHost_temp : ${g_IsController} != ${selfIsHost_temp}`);
			}
		}


	}
	return selfIsHost_temp
}


// let g_PlayerAssignments;



// Check if g_PlayerAssignments exists and has an object with the specified guid
// if (g_PlayerAssignments && g_PlayerAssignments[guid]) {
// 	const playerName = g_PlayerAssignments[guid].name;
// 	warn(playerName);
//   } else {
// 	console.log("Player with the specified guid does not exist.");
//   }


const g_customIconJson = Engine.ReadJSONFile("moddata/autocivP_IconNames.json");
var g_fuzzyArrayResult = getFuzzyArrayFromJsonFile(g_customIconJson, true)
// var g_fuzzyArrayResult = getFuzzyArrayFromJsonFile("moddata/autocivP_IconNames.json", false)

var g_is_chatInputTooltipQuickFixUpdate_updated = false

// const selfNick = Engine.LobbyGetNick();
var g_selfNick = Engine.ConfigDB_GetValue("user", `playername.multiplayer`);

// buzzwords: var g_chat ... g_chatTextInInputFild_when_msgCommand
var g_chat_draft = ''
// var g_chatTextInInputFild_when_msgCommand = ''
var g_chatTextInInputFild_when_msgCommand = ''
var g_chatTextInInputFild_when_msgCommand_lines = 0

const chatInput = Engine.GetGUIObjectByName("chatInput")
if(chatInput)
  chatInput.caption = '/away 18'

// Engine.GetCurrentReplayDirectory
// GetEngineInfo.gameState.data
// if (false && Engine.HasReplayInterface()) {
	// Replay is running
	// Your code here for handling when a replay is running
	// selfMessage('in replay')
//   } else {
	// Replay is not running
	// Your code here for handling when a replay is not running
	// selfMessage('not in replay')
//   }

// var g_GameData = GetEngineInfo().data.stat; // not defined


/*!SECTION
about mod names about mod.io here tips:
https://wildfiregames.com/forum/topic/24333-guide-for-publishing-mods-on-modio/?do=findComment&comment=554945
*/


const versionOf0ad = Engine.GetEngineInfo().mods[0]['version']; // 0.0.26
// const zipOfAutocivPMod = 'https://api.mod.io/v1/games/5/mods/3105810/files/4097856/download'

const g_autocivPVersion_shared = get_autocivPVersion()
const g_previous_autocivPVersion = get_previous_autocivPVersion(g_autocivPVersion_shared)
const zipOfAutocivPMod = `https://github.com/sl5net/autocivP/releases/latest`
// const zipOfAutocivPMod = `https://github.com/sl5net/autocivP/releases/tag/v${g_previous_autocivPVersion}`

// https://github.com/sl5net/autocivP/releases/tag/v1.0.30

const actuallyWorkingAtVersion = g_previous_autocivPVersion == g_autocivPVersion_shared ? '' : `actually working at version ${g_autocivPVersion_shared}`
// warn(`actually working at version ${actuallyWorkingAtVersion}`)

// const whatsAutocivPMod = `AutoCivP mod is AutoCiv but it also supports profiles during game configuration, jitsi, command-history⟦Tab⟧⟦Tab⟧ and a lot more ( https://wildfiregames.com/forum/topic/107371-autocivp-add-ons-profiles-jitsi-team-call ) \n 1. download newest ZIP here ${zipOfAutocivPMod} \n 2. unzip it \n 3. rename folder to "autocivP" \n 4. copy this folder to "mods" folder. Path to user data: \n Linux     : ~/.config/0ad/mods \n Windows: %AppData%\\0ad\\mods \n macOS    : \/Users\/{YOUR USERNAME}\/Library\/Application\\ Support/0ad/mods \n tart 0 A.D., click Settings and Mod Selection. \n Double-click it, click Save Configuration and Start Mods. \n ${actuallyWorkingAtVersion} `

const whatsAutocivPMod = `AutoCivP mod is AutoCiv but it also supports profiles during game configuration, jitsi and a lot more ( https://wildfiregames.com/forum/topic/107371-autocivp-add-ons-profiles-jitsi-team-call ) \n 1. download newest ZIP here ${zipOfAutocivPMod} \n 2. unzip it \n 3. copy this folder to "mods" folder.  4. \n Double-click it in "Settings" > "Mod Selection", click "Save Configuration" and "Start Mods". \n ${actuallyWorkingAtVersion} `

const whatsCommunityMod = `communityMod is community-powered by the core team to improve the gameplay experience, particularly MP balance. The team wanted to give the community make it easier to contribute, thus this is hosted on gitlab and community members can request commit access ( https://gitlab.com/0ad/0ad-community-mod-a26 ) .`

// zipOfAutocivPMod = `https://github.com/sl5net/autocivP/archive/refs/tags/v${g_previous_autocivPVersion}.zip`


function get_previous_autocivPVersion(g_autocivPVersion) {
	const versionParts = g_autocivPVersion.split(".");
	const major = parseInt(versionParts[0]);
	const minor = parseInt(versionParts[1]);
	const patch = parseInt(versionParts[2]);

	// Subtract 1 from the patch version to get the previous version
	const previousPatch = patch - 1;

	// Check if the previous patch version is 0. If so, decrement the minor version and set the patch version to 99.
	const previousMinor = (previousPatch === 0) ? minor - 1 : minor;
	const previousPatchVersion = (previousPatch === 0) ? 99 : previousPatch;

	// Construct the previous version string
	const g_previous_autocivPVersion = `${major}.${previousMinor}.${previousPatchVersion}`;
	return	g_previous_autocivPVersion
}
function get_autocivPVersion() {
	let g_autocivPVersion
	const modsObj = Engine.GetEngineInfo().mods
	for (const [key, value] of Object.entries(modsObj)) {
		if (value.name.toLowerCase() == "autocivP".toLowerCase()) {
			g_autocivPVersion = value.version
			break
		}
	}
	return g_autocivPVersion
}


/**
 * Generates a fuzzy array from a given JSON file.
 *
 * @param {string} jsonFile - JSON file.
 * @return {Object} - The fuzzy array generated from the JSON file.
 */
function getFuzzyArrayFromJsonFile(customIconJson, useLevenshtein){
	// const customIconJson = Engine.ReadJSONFile(jsonFile);
	const customIconKeys = Object.keys(customIconJson);
	let fuzzyArrayResult = {}
	for (const key of customIconKeys) {
		const values = customIconJson[key];
		// communityModToggle = 18
		const fuzzyVals = FuzzySet(values, useLevenshtein, 2, 20); // i used 8 before. not 20 have a long workd 23-0710_2136-42
		fuzzyArrayResult[key] = fuzzyVals;
	}
    return fuzzyArrayResult;
}


function chatInputTooltipQuickFixUpdate() {
	if(g_is_chatInputTooltipQuickFixUpdate_updated) return

	// this is a workaround. should be moved to gui/... /ChatInputPanel or something
	// const ⟦Tab⟧ ‹Tab›
	// const tab = '⟦[color=\"220 255 153\"]Tab[/color]⟧'
	// const tab = '\[Tab\]' // => creates errors
	const tab = '⟦Tab⟧'
	const chatInput = Engine.GetGUIObjectByName("chatInput")
	if(chatInput){
	  chatInput.tooltip += ` Or try ${tab}  to autocomplete commands for select profile, chosen icons ( allicons+${tab} ☯ ♪♣‹) or other commands. Write "⁄help" or  "⁄help  ⁄∖d" or  "⁄help ⁄p" for more info about "/" commands.\n`
	  chatInput.tooltip += ' Matching algorithm is more strict when text is longer.\n'
	  chatInput.tooltip += 'Use uppercase to temporarily reduce the sensitivity of the substitutions mechanism\n'
	  chatInput.tooltip += `Use ${tab} in empty chat to 1. Copy a chat message that was posted to you. 2. Retrieve your chat draft.`
	}

	g_is_chatInputTooltipQuickFixUpdate_updated = true
}

function translGGWP_splitInWords_II(captionTrimed, minMatchScore){
	const regexPattern = / /;
	const splitArray = captionTrimed.split(regexPattern);
	// for (const element of splitArray) {
	// 	console.log(element);
  	// }

	for (const [index, value] of splitArray.entries()) {
		// selfMessage(`Index: ${index}, Value: ${value}`);
		splitArray[index] = translGGWP_splitInWords_II_part2(value, minMatchScore)
		// selfMessage(`Index: ${index}, Value: ${splitArray[index]}`);
	}
	const joinedString = splitArray.join(' ');
	// selfMessage(`${linnr1()}: ${joinedString}`);
	return joinedString
}


function translGGWP_splitInWords_II_part2(captionTrimed, minMatchScore){
	let isDebug = false
	// isDebug = true

	if(captionTrimed == '<3')
		captionTrimed = 'love'

	// selfMessage(`${linnr2()}: translGGWP_splitInWords_II(${captionTrimed}, ${minMatchScore})`);


	if(!minMatchScore && isDebug)
	{
		selfMessage('69: minMatchScore==${minMatchScore}');
		error('69: minMatchScore==${minMatchScore}');
	}

	if(isDebug)
		selfMessage(`${linnr3()}: splitInWords_II()== >${captionTrimed}<`);
	// const regex = /\b([^‹›\s,\.!;\?]+)\b/g;
	const regex = /\b([^‹›\s]+)\b/g;
	// const regex2 = /(?<!\S)[><](?!\S)/g // dont work
	const regex2 = /([>\-<):\(\-\)]+)/g // work for find smilies and arrow

	let allIconsInText = captionTrimed.replace(regex, match => {
		if(isDebug)
	  		selfMessage(`${linnr4()}: translGGWP_splitInWords_II()==>  ||${match}||`)
	  const translated = translGGWP_U2Gg_III(match, minMatchScore)
	  return translated !== null ? translated : match;
	});

	allIconsInText = allIconsInText.replace(regex2, match => {
		// Handle the standalone < or > here
		const isDebug = false
		if(isDebug)
				selfMessage(`${linnr5()}: ${match}`);
		if(!minMatchScore && isDebug)
		{
			selfMessage('91: minMatchScore==${minMatchScore}');
			error('91: minMatchScore==${minMatchScore}');
		}

		return translGGWP_U2Gg_III(match, minMatchScore)
		// return match; // You can replace it with any desired value
	  });

	  if(isDebug)
			selfMessage(`${linnr6()}: translGGWP_splitInWords_II()==> allIconsInText = ||${allIconsInText}||`);
	return allIconsInText
  }


/**
 * Translates marked strings in a given string.
 *
 * @param {string} gg - The input string with marked strings.
 * @param {number} minMatchScore - The minimum match score.
 * @return {string} The translated string with marked strings no replaced.
 */
function transGGWP_markedStrings_I(gg, minMatchScore) {
	let isDebug = false
	// isDebug = true
	if(isDebug){
		selfMessage(`${linnr7()}: ____________ transGGWP_markedStrings_I() ___________`);
		// gg = "‹Good game ❧ › ";
		selfMessage(`${linnr8()}: gg=>${gg}<`);
	}
	const ggBackup = gg;
	const markedStringRegex = /(‹[^‹›]*›)/g;
	const markedStrings = gg.match(markedStringRegex) || [];
	const allStrings = gg.split(markedStringRegex);

	if (markedStrings.length === 0) {
		// Handle case when no marked strings are found
		gg = translGGWP_splitInWords_II(gg, minMatchScore);
		if(isDebug)
			selfMessage(`${linnr9()}:transGGWP_markedStrings_I()=>  gg=${gg}`);
		return gg;
	}

	if (markedStrings.length === 1 && allStrings.length === 1) {
		// Handle case when only one marked string is found
		if(isDebug)
		selfMessage(`${linnr10()}:transGGWP_markedStrings_I()=> markedStrings[0]=${markedStrings[0]}`);
	  return markedStrings[0]; // Return the single marked string as is
	}

	const ggParts = allStrings.flatMap((value, index) => {
	  if (index % 2 === 0) {
		// Filter out the marked strings
		let re = [translGGWP_splitInWords_II(value, minMatchScore), markedStrings[index / 2]];
		if(isDebug)
			selfMessage(`${linnr11()}:transGGWP_markedStrings_I()=> re=>${re}<`);
		return re
	  }
	//   return value;
	});

	const re = ggParts.join(''); // Concatenate the array elements without a separator
	if(isDebug)
		selfMessage(`${linnr12()}: re=${re}`);
	return re;
  }



function translGGWP_U2Gg_III(gg, minMatchScore) {
	let isDebug = false
	// isDebug = true


	if( g_selfNick =="seeh"){
	}

	if(isDebug)
		selfMessage(`${linnr13()}: ____________ translGGWP_U2Gg_III(${gg}, ${minMatchScore}) ___________`);
	if( !minMatchScore){
		if( g_selfNick =="seeh" ){
			// selfMessage(`${linnr14()}: minMatchScore = ${minMatchScore}`);
			// error(`minMatchScore is not defined`);
		}
		minMatchScore = 0.8 // some value. quick fix. todo: why its empty? 23-0729_1618-01
	}

	let lowercaseGg = gg.toLowerCase()
	let doSend2allChatUsers = false
	if (lowercaseGg == 'allicons2All'.toLocaleLowerCase()) {
		doSend2allChatUsers = true
		lowercaseGg = 'allicons'
	}
	if (lowercaseGg == 'allicons') {
	  const vArr = Object.keys(g_customIconJson);
	  let s = 'allicons: '
	  vArr.forEach((k, v) => {
		  const vArr = Object.values(g_customIconJson[k]);
		if(doSend2allChatUsers)
		  	sendMessage(`${k} <- ${vArr}`);
		else
			selfMessage(`${k} <- ${vArr}`);
		  s += `${k} < ${vArr}`
		  s += ` | `
	  })
	  const t = `you dont need write it ecactly. it finds results also if you write to less or bit wrong (its fuzzy-search). disable all icons in settings in options menu. some are contect senitive.`
	  s += t
	  if(doSend2allChatUsers)
		  sendMessage(`${t}`);
	  else
	    selfMessage(`${t}`);
	return s // its big string so it will be cut off somewhere in the middle
	}
	if (lowercaseGg == 'alliconkeys') {
	  const vArr = Object.keys(g_customIconJson);
	  const s = 'alliconkeys: ' + vArr.join(', ');
	  selfMessage(`${s}`);
	  return s
	}



	// https://unicodeemoticons.com/
	// btw guiObject is not definded her so you cant use this: sendMessageGlHfWpU2Gg(..., guiObject)


	// ‹be right back ☯ ›

	let text =  '';

	let query
	query = gg;
	// warn('/' + '‾'.repeat(32));


	let stringWithUnicode = findBestMatch(query, g_fuzzyArrayResult, minMatchScore);


	if(  stringWithUnicode
		&& stringWithUnicode.bestMatch
		&& Engine.ConfigDB_GetValue("user", `autociv.chatText.font.useitwithoutUnicode`) === 'true'
		)
		stringWithUnicode.bestMatch = stringWithUnicode.bestMatch.replace(/[^\x00-\x7F]/g, "");

	// stringWithoutUnicode

	if(isDebug){
		warn(`120: Best match for query "${query}": ##${stringWithUnicode.bestMatch}## (${stringWithUnicode.bestMatchWord})`);
		selfMessage(`${linnr15()}: Best match for query "${query}": ##${stringWithUnicode.bestMatch}## (${stringWithUnicode.bestMatchWord} , ${minMatchScore})`);
		warn('\\________________________________')
	}

	if(stringWithUnicode && stringWithUnicode.bestMatch)
		return stringWithUnicode.bestMatch;

		// todo: this is not working. needs implementd again
	  return gg;
}



function getNextLastCommandID(){
	// selfMessage(`g_lastCommandID = ${g_lastCommandID}       gui/common/~autocivSharedCommands.js`);
	let nextID = g_lastCommandID + 1
	if(nextID > g_lastCommandIDmax) nextID = 0
	return nextID
}
function saveLastCommand2History(lastCommand){
	let doDebug = false // debug session
	// doDebug = true // debug session
	// selfMessage(`lastCommand = ${lastCommand}`);
	if(!lastCommand)
	  return;
	lastCommand = lastCommand.trim()
	if(!lastCommand)
	  return;
	if(lastCommand == g_lastCommand)
	  return;
	if(lastCommand.toLocaleLowerCase() == "communityModToggle".toLocaleLowerCase()){ // maybe a bit to dangerous to trigger it exidentally. so maybe better keep it out of history. what you think?
		g_lastCommand = lastCommand;
		return;
	}

	// selfMessage(`lastCommand = ${lastCommand}`);
	let lastCommandID_i = 0
	let offset = 0
	let needChechedIdsFromBeging = (g_lastCommandID == 0) ? false : true
	let isFreeHistory = false
	for (let i = 0; i <= g_lastCommandIDmax; i++) {
	  lastCommandID_i = i + g_lastCommandID + offset; // maybe 5 6 7 8 9
	  if(doDebug) selfMessage(`${linnr16()}: lastCommandID_i = ${lastCommandID_i}`)

	  if (lastCommandID_i > g_lastCommandIDmax)
	  	lastCommandID_i -= g_lastCommandIDmax; // maybe 1 2 3 4
	  const lastCommand_i = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${lastCommandID_i}`);
	  if(!lastCommand_i.length){ // selfMessage('is empty');
			if(!needChechedIdsFromBeging){
				isFreeHistory = true
				break;
				if(doDebug) selfMessage(`${linnr17()}: lastCommandID_i = ${lastCommandID_i}`)
			}
			else
				{
					offset = - i - g_lastCommandID // so loop start with 0
					if(doDebug) selfMessage(`${linnr18()}: lastCommandID_i = ${lastCommandID_i}`)
					needChechedIdsFromBeging = false
					continue
				}
	  }
	  if(doDebug) selfMessage(`${linnr19()}: id=${lastCommandID_i} >${lastCommand}< ???? >${lastCommand_i}<`)
	  if(lastCommand == lastCommand_i) // dont save it twice
	  {
		  // selfMessage('dont save it twice');
		//   g_lastCommand = lastCommand;
		  return
	  }
	}
	// selfMessage(`757 lastCommand = ${lastCommand}`);
	if(!isFreeHistory)
		lastCommandID_i = getNextLastCommandID()
	g_lastCommandID = lastCommandID_i;
	g_lastCommand = lastCommand;
	ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.chat.lastCommand${g_lastCommandID}`, g_lastCommand);
	ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.chat.g_lastCommandID`, g_lastCommandID);
	// selfMessage(`${linnr20()}: g_lastCommandID = ${g_lastCommandID} saved`);
	if(doDebug) selfMessage(`${linnr21()}: id=${g_lastCommandID}  >${g_lastCommand}< saved`);
	return;
  }


// Input expected "name (rating) : message". (rating) optional
function autociv_GetNameRatingText(text)
{
	const spliterIndex = text.indexOf(":");
	if (spliterIndex == -1)
		return false;

	let { nick, rating } = splitRatingFromNick(text.slice(0, spliterIndex).trim());
	if (!nick)
		return false;
	return {
		"name": nick,
		"rating": rating,
		"text": text.slice(spliterIndex + 1)
	}
};

// use /command to trigger the following commands:
const g_autociv_SharedCommands = {
	"hiAll" : {
		"description": "Say hello (configurable). set /hiAll yourWelcomeText or send with /hiAll yourWelcomeText",
		"handler": (text) =>
		{
					const key = "autocivP.msg.helloAll";
					if(text){
				ConfigDB_CreateAndSaveValueA26A27("user", key, text);
				selfMessage(
						`helloAll was set to ${text}`
				);
					}else{
				let helloAllText = Engine.ConfigDB_GetValue("user", key);
				if(!helloAllText){
						helloAllText = 'hi hf.';
						ConfigDB_CreateAndSaveValueA26A27("user", key, helloAllText);
				}
				const chatInput = Engine.GetGUIObjectByName("chatInput")
				chatInput.caption = helloAllText
					}
			}
	},
	"zipOfAutocivPMod" : {
		"description": "AutoCivP mod is ",
		"handler": () =>
		{
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = `${zipOfAutocivPMod} (28 July 2023)` // that version from 23-0728_0140-50
		}
	},
	"whatsAutocivPMod" : {
		"description": "AutoCivP mod is ",
		"handler": () =>
		{
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = whatsAutocivPMod
		}
	},
	"legend" : {
		"description": "legend of some special symbols",
		"handler": () =>
		{
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = `legend: ♤ proGUI mod, ♇ autocivP mod`

			// text = text.replace('proGUI', 'proGUI♤') //  ♡ autocivP❧♣▦▣ mod
			// text = text.replace(/\bautocivP\b/ig, 'autocivP♇') //  ♡ autocivP❧♣▦▣ mod

		}
	},
	"whatsAutoCivMod" : {
		"description": "AutoCiv mod is ",
		"handler": () =>
		{
			const whatsAutocivMod = 'AutoCiv mod is an aggregation of features meant to enhance the 0 A.D. HotKeys and more. Many players use it ( https://wildfiregames.com/forum/topic/28753-autociv-mod-0ad-enhancer ) .'
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = whatsAutocivMod
		}
	},
	"whatsAlliedView" : {
		"description": "AutoCiv mod is ",
		"handler": () =>
		{
			const text = '"Allied View" is a game option thats been added to vanilla 0ad a26. When the option is enabled, allies will basically have "cartography mode" on at the start of the game. '
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
		}
	},
	"whatsBoonGUI" : {
		"description": "AutoCiv mod is ",
		"handler": () =>
		{
			const whatsThisMod = 'boonGUI is best  mod to watch replays (its build by Langbart and others. to could update was moved to https://github.com/0ad-matters/boonGUI ) .'
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = whatsThisMod
		}
	},
	"whatsJitsi" : {
		"description": "Jitsi is ",
		"handler": () =>
		{
			const JitsiText = 'Jitsi is a great way to have quick team calls without any setup process. It can also be used as an audio chat for your 0ad-team.'
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = JitsiText
		}
	},
	"whatsFeldmap" : {
		"description": "feldmap is ",
		"handler": () =>
		{
			const JitsiText = `feldmap mod adds the map "Mainland balanced". Alpine Mountains is also included ( https://https://wildfiregames.com/forum/topic/53880-feldmap ) `
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = JitsiText
		}
	},
	"whatsCommunityMod" : {
		"description": "communityMod is ",
		"handler": () =>
		{
			const text = whatsCommunityMod
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
			//  seems not working in looby but in setup and ingame 23-0806_1937-40 ?
			// and i press tab then to fuzzy search changes it to the toggle command
		}
	},
	"programmers" : {
		"description": "communityMod is ",
		"handler": () =>
		{
const text = `If you have suggestions for changinge the source-code a bit, share results of your change. Instead of providing suggestions right away, you may could first try implementing your suggestions and then share the results or outcomes. This way, its easys to understand their impact.
BTW for chat maybe use https://matrix.to/#/#0ad:matrix.org, https://webchat.quakenet.org/?channels=0ad, maybe https://discord.gg or any other chat service.
BTW list of functions: https://trac.wildfiregames.com/wiki/EngineFunctions
.`
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text.replace(/\r\t/g, '') // tabe needs to be fut off. also ths wagenrücklauf
		}
	},
	"whatstimeNow" : {
		"description": "whats Time now hoursMinute",
		"handler": () =>
		{
			// selfMessage(`${linnr22()}: whatstimeNow`)
			// warn(`423: whatstimeNow`)

			const today = new Date();
			const hours = today.getHours().toString().padStart(2, '0');
			const minutes = today.getMinutes().toString().padStart(2, '0');
			const text = `it's ${hours}:${minutes} here.`
			const chatInput = Engine.GetGUIObjectByName("chatInput");

			chatInput.focus()
			chatInput.caption = text; // for some reasons this is not working in lobby at the moment 23-0724_0958-02. its ignored
			chatInput.buffer_position = text.length
			// if(g_selfNick =="seeh") //NOTE - 23-0705_2302-57 developers want to see the error in the console
			// 	selfMessage(`${linnr23()}: whatstimeNow: ${text} (gui/common/~autocivSharedCommands.js)`);
		}
	},
	"timenow" : {
		"description": "Time here in hoursMinute",
		"handler": () =>
		{
			if( gameState == "ingame" )
				selfMessage("for using timenow during a ingame chat, remove / and press ⟦Tab⟧");
			const today = new Date();
			const hours = today.getHours().toString().padStart(2, '0');
			const minutes = today.getMinutes().toString().padStart(2, '0');
			const text = `it's ${hours}:${minutes} here.`;
			const chatInput = Engine.GetGUIObjectByName("chatInput");

			if( gameState == "lobby" )
				sendMessage(text)
			else{
				chatInput.focus()
				chatInput.caption = text; // for some reasons this is not working in lobby at the moment 23-0724_0958-02. its ignored
			}
			if(g_selfNick =="seeh") //NOTE - 23-0705_2302-57 developers want to see the error in the console
				selfMessage(`${linnr24()}: timenow: ${text} (gui/common/~autocivSharedCommands.js)`);
		}
	},
	"modsImCurrentlyUsing": {
		"description": "Mods I'm currently using. Or try without the postfix '/' and at the end of the command ⟦Tab⟧",
		"handler": () =>
		{




			if( gameState == "ingame" )
				selfMessage("for show Mods I'm currently using during a ingame chat, remove / and press ⟦Tab⟧");

			const modEnabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);
			// sendMessage(`Mods I'm currently using: ${modEnabledmods.slice(11,)}` );
			const text = `Mods I'm currently using: ${modEnabledmods.slice(11,)} ${g_previous_autocivPVersion}`;
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
		}
	},
	"jitsi": {
		"description": "use of jitsi",
		"handler": () =>
		{
			let text = `to use jiti in you team: 1. open Ally-Chat 2. write j⟦Tab⟧ then enter. 3. write li⟦Tab⟧ or /link`;
			text += ` BTW if you write j⟦Tab⟧ again your last jitsi link will send again(not a new link). Every player has is own link. Means: one link per player.`;
			// in lobby long text will eventually crash the game. 23-0629_0840-55
			// Engine.SendNetworkChat(text);

			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text

		}
	},
	'li': {
		"description": "use of jitsi in the game",
		"handler": () =>
		{
			let text = ''
			text = `write li⟦Tab⟧ or /link<enter> to open a link`;
			// Engine.SendNetworkChat(text);
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
		}
	},

	"mute": {
		"description": "Mute player.",
		"handler": (player) =>
		{
			if (player == "")
				return selfMessage("You need to type a nick to mute player at all places with chat.")
			let nick = splitRatingFromNick(player).nick;

			if(nick == g_selfNick)
				return selfMessage(`not allowed to mute yourself ${g_selfNick}.`)

			botManager.get("mute").instance.setValue(nick, nick);
			selfMessage(`You have muted ${nick}.`);
		}
	},
	"unmute": {
		"description": "Unmute player.",
		"handler": (player) =>
		{
			if (player == "")
				return selfMessage("You need to type a nick to unmute.")
			let nick = splitRatingFromNick(player).nick;
			botManager.get("mute").instance.removeValue(nick);
			selfMessage(`You have unmuted ${nick}.`);
		}
	},
	"muteclear": {
		"description": "Clear list of muted players.",
		"handler": () =>
		{
			botManager.get("mute").instance.removeAllValues();
			selfMessage("You have cleared muted list.");
		}
	},
	"mutelist": {
		"description": "List of muted players.",
		"handler": () =>
		{
			let list = botManager.get("mute").instance.getIds();
			selfMessage(`Muted ${list.length} people`);
			for (let name of list)
				selfMessage("| " + name);
		}
	},
	"linklist": {
		"description": "Shows the list of links detected in the chat.",
		"handler": () =>
		{
			selfMessage(botManager.get("link").getInfo());
		}
	},
	"link": {
		"description": "Open links from /linklist.",
		"handler": (index) =>
		{
			let err = botManager.get("link").openLink(index);
			if (err)
				selfMessage(err);
		}
	},
	"vote": {
		"description": "Voting poll. Use /vote option1:option2:option3:option4",
		"handler": (votingChoices) =>
		{
			botManager.get("vote").toggle(votingChoices);
		}
	},
	"votereset": {
		"description": "Reset vote poll votes to 0.",
		"handler": () =>
		{
			botManager.get("vote").resetVoting();
			botManager.get("vote").printVoting();
		}
	},
	"voteshow": {
		"description": "Display current votes poll.",
		"handler": () =>
		{
			botManager.get("vote").printVoting();
		}
	},
	"playerReminderToggle": {
		"description": "Keep a note about a player that will show when he joins.",
		"handler": () =>
		{
			botManager.get("playerReminder").toggle();
			selfMessage(`playerReminder has been ${botManager.get("playerReminder").active ? "enabled" : "disabled"}.`)
		}
	},
	"playerReminder": {
		"description": "Keep a note about a player that will show when he joins.",
		"handler": (command) =>
		{
			let data = autociv_GetNameRatingText(command);
			if (!data || !data.name || !data.text)
				return selfMessage("Invalid name and/or note. (Use e.g /playerReminder name : note ).")

			botManager.get("playerReminder").instance.setValue(data.name, data.text);
			selfMessage(`Player ${data.name} has been added to playerReminder list.`);
		}
	},
	"playerReminderRemove": {
		"description": "Keep a note about a player that will show when he joins",
		"handler": (player) =>
		{
			if (player == "")
				return selfMessage("You need to type a nick to remove player reminder.")

			let nick = splitRatingFromNick(player.trim()).nick;
			if (!nick)
				return;

			botManager.get("playerReminder").instance.removeValue(nick);
			selfMessage(`Player ${nick} has been removed from playerReminder list.`);
		}
	},
	"playerReminderList": {
		"description": "Keep a note about a player that will show when he joins",
		"handler": () =>
		{
			let bot = botManager.get("playerReminder").instance;
			let players = bot.getIds();
			if (!players.length)
				return selfMessage(`No playerReminder added.`)

			for (let player of players)
				selfMessage(`Reminder == ${player} : ${bot.getValue(player)}`);
		}
	}
};

function autociv_InitSharedCommands()
{
	if (!(botManager.messageInterface in autociv_InitSharedCommands.pipe))
		return;

	for (let key in g_autociv_SharedCommands)
		autociv_InitSharedCommands.pipe[botManager.messageInterface](key);
}

autociv_InitSharedCommands.pipe = {
	"lobby": key =>
	{
		gameState = "lobby";
		const chatInput = Engine.GetGUIObjectByName("chatInput")
		if(chatInput && chatInput.caption.length < 1){
			chatInput.focus()
  			chatInput.caption = '/away' // just a suggestion. maybe you want to be away from the begginning. first check who is online. maybe want join as observer later. not always want play from the begginning.
			// works without any problem, but pipe is maybe not the best way

			// i peronally like to be away as suggestion in the caption because it is easy to read and a learning experience

			// ohter very good implementation see:
			// https://github.com/rossenburgg/godseye/blob/ALARIC/gui/lobby/autoAway.js#L83
		}
		ChatCommandHandler.prototype.ChatCommands[key] = {
			"description": g_autociv_SharedCommands[key].description,
			"handler": text =>
			{
				if(key == 'jitsi') // long text a critical in the looby. better not so many commands there with long texts
					return true
				g_autociv_SharedCommands[key].handler(text)
				// g_autociv_SharedCommands.whatstimeNow.handler()


				// autociv_focus.chatInput

				if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see more
					selfMessage(`${linnr25()}: SharedCommands: '${key}' = '${text}'`)
				}
				return true
			}
		}
	},
	"gamesetup": key =>
	{
		gameState = "gamesetup";
		g_NetworkCommands["/" + key] = text =>
		{
			saveLastCommand2History(`/${key} ${text}`)
			g_autociv_SharedCommands[key].handler(text)
			return true
		}
	},
	"ingame": key =>
	{
		if(gameState != "ingame" && g_IsReplay){  // default it will warn
			const modEnabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);

			const modProfilealwaysInReplay = Engine.ConfigDB_GetValue("user", 'modProfile.alwaysInReplay');
			let clean = modEnabledmods
			// let clean2 = clean.replace('autocivP', `${modProfilealwaysInReplay} autocivp` );
			// let clean2 = clean.replace( 'autocivp', `${modProfilealwaysInReplay} autocivp` );
			const clean2 = clean.replace(/\b(autocivP.*?)\b/ig, `${modProfilealwaysInReplay} $1` );

			if(!(modEnabledmods.indexOf(modProfilealwaysInReplay)>0)){
				// warn(`Really want play a replay without 'boonGUI' mod ?`);
				ConfigDB_CreateAndSaveValueA26A27("user", "mod.enabledmods", clean2)
				check_modProfileSelector_settings()

				try {
					Engine.Restart(1) // works sometimes Engine. and sometimes: Restart is not a function
				  } catch (error) {
					if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
						warn(error.message)
						warn(error.stack)
					  }
					warn('well done. Please start 0ad now again.')
					Engine.Exit(1) // works

				}

			}
			// endOf is replay
		}

		//TODO - delete it later 23-0815_2249-29
		if(gameState != "ingame"){ // to make sure this command is not now already set. later it will be

			let bugIt = false // new implementation so i will watch longer
			// bugIt = true && g_selfNick =="seeh" // new implementation so i will watch longer
			if(bugIt){
				// selfMessage(`rated(): ${g_GameSettings.rating.enabled} - gui/common/~autocivSharedCommands.js : ${linnr26()}`)
				selfMessage(`${linnr27()}: rated: ${g_InitAttributes.settings.RatingEnabled === true} - gui/common/~autocivSharedCommands.js : ${linnr27()}`)
			}
		}

		// to check thats first moment and not already set to "ingame"
		if(gameState != "ingame"
		&& !g_IsObserver
		&& !g_IsReplay){
			// selfMessage(`g_selfNick: ${g_selfNick} - ${linnr28()}`)
			if(Engine.GetPlayerGUID() === undefined
			||	g_PlayerAssignments[Engine.GetPlayerGUID()] === undefined
			|| g_PlayerAssignments[Engine.GetPlayerGUID()].name.indexOf('|') == -1){
				// selfMessage(`name: ${g_PlayerAssignments[Engine.GetPlayerGUID()].name} - ${linnr29()}`)

				// selfMessage(`g_IsReplay: ${g_IsReplay} - ${linnr30()}`)

				const modEnabledmods = Engine.ConfigDB_GetValue(
					"user",
					"mod.enabledmods"
				);



				const isRated = g_InitAttributes.settings.RatingEnabled === true

				if(g_IsController){ // for your next setup becouse you are host
					const doRatedDefaultAutoupdate = ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.gameStart.doRatedDefaultAutoupdate") === "true" )

					if(doRatedDefaultAutoupdate){
						const isRatedDefault = ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.ratedDefault") === "true" )
						// maybe update then rated default.
						if(isRatedDefault != isRated)
							ConfigDB_CreateAndSaveValueA26A27("user", "autocivP.gamesetup.ratedDefault", isRated)
					}
				}

				// for more fairplay if isRated, some mods should be visible as text message when the user name not already show that this mod is used
				if(isRated && modEnabledmods.indexOf("proGUI") > -1){
					const text = `Mods I use: ${modEnabledmods.slice(11)}`
					// const text = `Mods I use: ${modEnabledmods.slice(11)}. \nSome say it's important for others to know \nwhich mods I use when game starts.`
					sendMessage(text)
					// selfMessage(`game.is.rated(): ${game.is.rated()} - ${linnr31()}`)
				}


			}
		}

		gameState = "ingame";

		// selfMessage(linnr32()))

		g_NetworkCommands["/" + key] = text =>
		{
			saveLastCommand2History(`/${key} ${text}`)
			g_autociv_SharedCommands[key].handler(text)
			return true
		}
	}
}

/**
 * This code snippet demonstrates how to use fuzzy matching to find the best match for a query in a collection of icon values.
 * It utilizes a fuzzy icon set (fuzzyIcons) and a fuzzy matching library (FuzzySet or fuzzyVals) to find the closest match based on similarity scores.
 *
 * The code snippet includes an example workflow with a predefined query and fuzzy icon values.
 * It demonstrates how to find matches for the query and display the best match with its similarity score using the warn function.
 *
 * @return {undefined} No return value
 */
function fuzzyIconMatcherExample() {
	warn('=====================================');

	// const fuzzyVals = FuzzySet(iconValues, true, 3, 3);
	const fuzzyVals = g_fuzzyArrayResult["♡"];
	const query = "go";
	const matches = g_fuzzyArrayResult["♡"].get(query);

	if (matches !== null) {
	  // The query has a match
	  const similarityScore = matches[0][0];
	  const matchedString = matches[0][1];
	  warn(`The query "${query}" matched to word "${matchedString}" with a similarity score of ${similarityScore}`);
	} else {
	  // No match found for the query
	  warn(`76: No match found for the query "${query}"`);
	}

	// results:
	// WARNING: The query "lve" matched "love" with a similarity score of 0.75
	// WARNING: The query "3" matched "<3" with a similarity score of 0.5
	// WARNING: The query "love" matched "undefined" with a similarity score of 1,love
}


/**
 * Creates a new FuzzySet object.
 *
 * @param {Array} arr - An array of values to initialize the set with. Default is an empty array.
 * @param {boolean} useLevenshtein - Whether to use the Levenshtein distance algorithm for matching. Default is true.
 * @param {number} gramSizeLower - Default is 2. minimum size of the characters in a string.
 * @param {number} gramSizeUpper - Default is 3. maximum size of the characters in a string.
 * @return {Object} A FuzzySet object.
 * @author: https://github.com/axiak/fuzzyset
 */
function FuzzySet(arr, useLevenshtein, gramSizeLower, gramSizeUpper)
{
	let fuzzyset = {

	};

	// default options
	arr = arr || [];
	fuzzyset.gramSizeLower = gramSizeLower || 2;
	fuzzyset.gramSizeUpper = gramSizeUpper || 3;
	fuzzyset.useLevenshtein = (typeof useLevenshtein !== 'boolean') ? true : useLevenshtein;

	// define all the object functions and attributes
	fuzzyset.exactSet = {};
	fuzzyset.matchDict = {};
	fuzzyset.items = {};

	// helper functions
	let levenshtein = function(str1, str2)
	{
		let current = [],
			prev, value;

		for (let i = 0; i <= str2.length; i++)
			for (let j = 0; j <= str1.length; j++)
			{
				if (i && j)
					if (str1.charAt(j - 1) === str2.charAt(i - 1))
						value = prev;
					else
						value = Math.min(current[j], current[j - 1], prev) + 1;
				else
					value = i + j;

				prev = current[j];
				current[j] = value;
			}

		return current.pop();
	};

	// return an edit distance from 0 to 1
	let _distance = function(str1, str2)
	{
		if (str1 === null && str2 === null) throw 'Trying to compare two null values';
		if (str1 === null || str2 === null) return 0;
		str1 = String(str1);
		str2 = String(str2);

		let distance = levenshtein(str1, str2);
		if (str1.length > str2.length)
		{
			return 1 - distance / str1.length;
		}
		else
		{
			return 1 - distance / str2.length;
		}
	};
	let _nonWordRe = /[^a-zA-Z0-9\u00C0-\u00FF, ]+/g;

	let _iterateGrams = function(value, gramSize)
	{
		gramSize = gramSize || 2;
		let simplified = '-' + value.toLowerCase().replace(_nonWordRe, '') + '-',
			lenDiff = gramSize - simplified.length,
			results = [];
		if (lenDiff > 0)
		{
			for (let i = 0; i < lenDiff; ++i)
			{
				value += '-';
			}
		}
		for (let i = 0; i < simplified.length - gramSize + 1; ++i)
		{
			results.push(simplified.slice(i, i + gramSize));
		}
		return results;
	};

	let _gramCounter = function(value, gramSize)
	{
		// return an object where key=gram, value=number of occurrences
		gramSize = gramSize || 2;
		let result = {},
			grams = _iterateGrams(value, gramSize),
			i = 0;
		for (i; i < grams.length; ++i)
		{
			if (grams[i] in result)
			{
				result[grams[i]] += 1;
			}
			else
			{
				result[grams[i]] = 1;
			}
		}
		return result;
	};

	// the main functions
	fuzzyset.get = function(value, defaultValue, minMatchScore)
	{
		// check for value in set, returning defaultValue or null if none found
		if (minMatchScore === undefined)
		{
			minMatchScore = 0.33;
		}
		let result = this._get(value, minMatchScore);
		if (!result && typeof defaultValue !== 'undefined')
		{
			return defaultValue;
		}
		return result;
	};

	fuzzyset._get = function(value, minMatchScore)
	{
		let normalizedValue = this._normalizeStr(value),
			result = this.exactSet[normalizedValue];
		if (result)
		{
			return [
				[1, result]
			];
		}

		let results = [];
		// start with high gram size and if there are no results, go to lower gram sizes
		for (let gramSize = this.gramSizeUpper; gramSize >= this.gramSizeLower; --gramSize)
		{
			results = this.__get(value, gramSize, minMatchScore);
			if (results && results.length > 0)
			{
				return results;
			}
		}
		return null;
	};

	fuzzyset.__get = function(value, gramSize, minMatchScore)
	{
		let normalizedValue = this._normalizeStr(value),
			matches = {},
			gramCounts = _gramCounter(normalizedValue, gramSize),
			items = this.items[gramSize],
			sumOfSquareGramCounts = 0,
			gram,
			gramCount,
			i,
			index,
			otherGramCount;

		for (gram in gramCounts)
		{
			gramCount = gramCounts[gram];
			sumOfSquareGramCounts += Math.pow(gramCount, 2);
			if (gram in this.matchDict)
			{
				for (i = 0; i < this.matchDict[gram].length; ++i)
				{
					index = this.matchDict[gram][i][0];
					otherGramCount = this.matchDict[gram][i][1];
					if (index in matches)
					{
						matches[index] += gramCount * otherGramCount;
					}
					else
					{
						matches[index] = gramCount * otherGramCount;
					}
				}
			}
		}

		function isEmptyObject(obj)
		{
			for (let prop in obj)
			{
				if (obj.hasOwnProperty(prop))
					return false;
			}
			return true;
		}

		if (isEmptyObject(matches))
		{
			return null;
		}

		let vectorNormal = Math.sqrt(sumOfSquareGramCounts),
			results = [],
			matchScore;
		// build a results list of [score, str]
		for (let matchIndex in matches)
		{
			matchScore = matches[matchIndex];
			results.push([matchScore / (vectorNormal * items[matchIndex][0]), items[matchIndex][1]]);
		}
		let sortDescending = function(a, b)
		{
			if (a[0] < b[0])
			{
				return 1;
			}
			else if (a[0] > b[0])
			{
				return -1;
			}
			else
			{
				return 0;
			}
		};
		results.sort(sortDescending);
		if (this.useLevenshtein)
		{
			let newResults = [],
				endIndex = Math.min(50, results.length);
			// truncate somewhat arbitrarily to 50
			for (let i = 0; i < endIndex; ++i)
			{
				newResults.push([_distance(results[i][1], normalizedValue), results[i][1]]);
			}
			results = newResults;
			results.sort(sortDescending);
		}
		let newResults = [];
		results.forEach(function(scoreWordPair)
		{
			if (scoreWordPair[0] >= minMatchScore)
			{
				newResults.push([scoreWordPair[0], this.exactSet[scoreWordPair[1]]]);
			}
		}.bind(this));
		return newResults;
	};

	fuzzyset.add = function(value)
	{
		let normalizedValue = this._normalizeStr(value);
		if (normalizedValue in this.exactSet)
		{
			return false;
		}

		let i = this.gramSizeLower;
		for (i; i < this.gramSizeUpper + 1; ++i)
		{
			this._add(value, i);
		}
	};

	fuzzyset._add = function(value, gramSize)
	{
		let normalizedValue = this._normalizeStr(value),
			items = this.items[gramSize] || [],
			index = items.length;

		items.push(0);
		let gramCounts = _gramCounter(normalizedValue, gramSize),
			sumOfSquareGramCounts = 0,
			gram, gramCount;
		for (gram in gramCounts)
		{
			gramCount = gramCounts[gram];
			sumOfSquareGramCounts += Math.pow(gramCount, 2);
			if (gram in this.matchDict)
			{
				this.matchDict[gram].push([index, gramCount]);
			}
			else
			{
				this.matchDict[gram] = [
					[index, gramCount]
				];
			}
		}
		let vectorNormal = Math.sqrt(sumOfSquareGramCounts);
		items[index] = [vectorNormal, normalizedValue];
		this.items[gramSize] = items;
		this.exactSet[normalizedValue] = value;
	};

	fuzzyset._normalizeStr = function(str)
	{
		if (Object.prototype.toString.call(str) !== '[object String]') throw 'Must use a string as argument to FuzzySet functions';
		return str.toLowerCase();
	};

	// return length of items in set
	fuzzyset.length = function()
	{
		let count = 0,
			prop;
		for (prop in this.exactSet)
		{
			if (this.exactSet.hasOwnProperty(prop))
			{
				count += 1;
			}
		}
		return count;
	};

	// return is set is empty
	fuzzyset.isEmpty = function()
	{
		for (let prop in this.exactSet)
		{
			if (this.exactSet.hasOwnProperty(prop))
			{
				return false;
			}
		}
		return true;
	};

	// return list of values loaded into set
	fuzzyset.values = function()
	{
		let values = [],
			prop;
		for (prop in this.exactSet)
		{
			if (this.exactSet.hasOwnProperty(prop))
			{
				values.push(this.exactSet[prop]);
			}
		}
		return values;
	};


	// initialization
	let i = fuzzyset.gramSizeLower;
	for (i; i < fuzzyset.gramSizeUpper + 1; ++i)
	{
		fuzzyset.items[i] = [];
	}
	// add all the items to the set
	for (i = 0; i < arr.length; ++i)
	{
		fuzzyset.add(arr[i]);
	}

	return fuzzyset;
}

/**
 * Finds the best match for a given query in a fuzzy array.
 * isNoWord is true if the query is not a word and then the match must be 100%
 *
 * @param {string} query - The query to search for.
 * @param {object} fuzzyArray - The fuzzy array to search in.
 * @return {object} An object containing the best match, the matched word, and the similarity score.
 */
function findBestMatch(query, fuzzyArray, minMatchScore = 0.3) {
	let isDebug = false
	//  isDebug = true
	let bestMatch = null;
	let bestMatchWord = null;
	let bestSimilarityScore = 0;

	if(!query)
		return ''
	if(isDebug)
		selfMessage(`findBestMatch for query "${query}"`);



	const regex = /^\W+$/;

	const isNoWord = regex.test(query);

	for (const key in fuzzyArray) {
	  const matches = fuzzyArray[key].get(query);

	  if (matches !== null && matches[0][0] > minMatchScore) {


		const similarityScore = matches[0][0];
		const matchedString = matches[0][1];

		if(isNoWord){
			if(matchedString === query){
				bestMatch = key;
				bestMatchWord = matchedString;
				bestSimilarityScore = similarityScore;
				break
			}else
				continue
		}

		if(isDebug){
			selfMessage(`isNoWord=${isNoWord}, key=${key}, matches = ${matches[0][1]}`);
			selfMessage(JSON.stringify(matches));
		}

		if (false) {
		  warn(`The query "${query}" matched to word "${matchedString}" with a similarity score of ${similarityScore}`);
		  warn(`fuzzyIcon = ${key}`);
		  warn(`minMatchScore = ${minMatchScore}`);
		}

		if (similarityScore > bestSimilarityScore) {
		  bestMatch = key;
		  bestMatchWord = matchedString;
		  bestSimilarityScore = similarityScore;
		}
	  }
	}

	if(isDebug)
	selfMessage(`bestMatch = ${bestMatch}, bestMatchWord = ${bestMatchWord}, bestSimilarityScore = ${bestSimilarityScore}`);

	return {
	  bestMatch: bestMatch,
	  bestMatchWord: bestMatchWord,
	  bestSimilarityScore: bestSimilarityScore
	};
  }

  function linnr33()) {
	const e = new Error();
	if (!e.stack) try {
	  throw e;
	} catch (e) {
	  if (!e.stack) {
		return 0; // IE < 10, likely
	  }
	}
	const stack = e.stack.toString()
	  .replace(/\[.*?\]/g, '')
	  .replace(/<[^>]*]>/g, '')
	  .split(/\r\n|\n/);
	const frameRE = /:(\d+:\d+)[^\d]*/;
	do {
	  var frame = stack.shift();
	} while (!frameRE.exec(frame) && stack.length);
	return frameRE.exec(stack.shift())[1];
  }


  function getDifference(str1, str2) {
	const m = str1.length;
	const n = str2.length;

	const dp = Array(m + 1)
	  .fill(null)
	  .map(() => Array(n + 1).fill(0));

	for (let i = 1; i <= m; i++) {
	  for (let j = 1; j <= n; j++) {
		if (str1[i - 1] === str2[j - 1]) {
		  dp[i][j] = dp[i - 1][j - 1] + 1;
		} else {
		  dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
		}
	  }
	}

	let i = m;
	let j = n;
	let diff = '';

	while (i > 0 && j > 0) {
	  if (str1[i - 1] === str2[j - 1]) {
		i--;
		j--;
	  } else if (dp[i - 1][j] >= dp[i][j - 1]) {
		diff = str1[i - 1] + diff;
		i--;
	  } else {
		diff = str2[j - 1] + diff;
		j--;
	  }
	}

	while (i > 0) {
	  diff = str1[i - 1] + diff;
	  i--;
	}

	while (j > 0) {
	  diff = str2[j - 1] + diff;
	  j--;
	}

	return diff;
  }
class AnimateGUIObjectManager
{
	constructor(GUIObject, GUIManagerInstance)
	{
		this.GUIManagerInstance = GUIManagerInstance
		this.GUIObject = GUIObject
		this.running = []
		this.queue = []
	}

	isAlive()
	{
		return this.running.length || this.queue.length
	}

	/**
	 * @param {Object} settings
	 * @param {Number} [settings.duration]
	 * @param {Number} [settings.delay]
	 * @param {String | Function} [settings.curve]
	 * @param {Function} [settings.onStart]
	 * @param {Function} [settings.onTick]
	 * @param {Function} [settings.onComplete]
	 * @param {Boolean} [settings.queue]
	 * @param {{r,g,b,a} | String} [settings.color]
	 * @param {{r,g,b,a} | String} [settings.textcolor]
	 * @param {{left,top,right,bottom,rleft,rtop,rright,rbottom} | String} settings.size
	 */
	add(settings)
	{
		this.GUIManagerInstance.setTicking(this)
		let newAnimation = new AnimateGUIObject(this.GUIObject, settings)

		if (newAnimation.data.queue)
			this.queue.push(newAnimation)
		else
		{
			this.running = this.running.filter(animation => animation.removeIntersections(newAnimation).isAlive())
			this.running.push(newAnimation)
		}

		return this
	}

	onTick()
	{
		const time = Date.now()

		do this.running = this.running.filter(animation => animation.run(time).hasRemainingStages())
		while (!this.running.length && this.queue.length && this.running.push(this.queue.shift()))

		return this
	}

	/**
	 * Ends animation as if had reached end time.
	 * onStart/onTick/onComplete called as usual.
	 */
	complete()
	{
		this.GUIManagerInstance.setTicking(this)
		for (let animation of this.running)
			animation.complete(false)

		return this
	}

	/**
	 * Ends animation as if had reached end time but without updating attributes.
	 * onStart/onTick/onComplete called as usual.
	 */
	finish()
	{
		this.GUIManagerInstance.setTicking(this)
		for (let animation of this.running)
			animation.complete(true)

		return this
	}

	/**
	 * Chain animations
	 * @param {Object} GUIObject
	 * @param {Object[]} chainSettingsList
	 * @param {Object} sharedSettings
	 */
	chain(chainSettingsList, sharedSettings)
	{
		this.GUIManagerInstance.setTicking(this)
		for (let settings of chainSettingsList)
			this.add(Object.assign({}, sharedSettings, settings))

		return this
	}
}
MapGridBrowser.prototype.updateMapList = function ()
{
	const selectedMap = this.mapList[this.selected]?.file;
	const mapType = this.mapBrowserPage.controls.MapFiltering.getSelectedMapType()
	const mapFilter = this.mapBrowserPage.controls.MapFiltering.getSelectedMapFilter()
	const filterText = this.mapBrowserPage.controls.MapFiltering.getSearchText();
	const randomMap = {
		"file": "random",
		"name": translate("Random"),
		"description": translate("Pick a map at random.")
	}

	let mapList = this.mapFilters.getFilteredMaps(mapType, mapFilter);

	if (mapType == "random")
		Array.prototype.unshift.apply(mapList, randomMap)

	if (filterText)
	{
		mapList = MatchSort.get(filterText, mapList, "name")
		if (!mapList.length)
		{
			const filter = "all";
			mapList.push(randomMap)
			for (let type of g_MapTypes.Name)
				for (let map of this.mapFilters.getFilteredMaps(type, filter))
					mapList.push(Object.assign({ "type": type, "filter": filter }, map));

			mapList = MatchSort.get(filterText, mapList, "name")
		}
	}

	this.mapList = mapList;
	this.itemCount = this.mapList.length;
	this.resizeGrid();
	this.setSelectedIndex(this.mapList.findIndex(map => map.file == selectedMap));
}
autociv_patchApplyN(MapBrowser.prototype, "openPage", function (target, that, args)
{
	that.controls.MapFiltering.searchBox.control.onPress = () =>
	{
		if (g_IsController && that.gridBrowser.mapList.length)
		{
			that.gridBrowser.setSelectedIndex(0)
			that.submitMapSelection();
			that.closePage();
		}
	}
	return target.apply(that, args)
})
g_OptionType["autociv_slider_int"] = {
	"objectType": "slider",
	"configToValue": value => parseInt(value, 10),
	"valueToGui": (value, control) =>
	{
		control.value = parseInt(value, 10);
	},
	"guiToValue": control => parseInt(control.value, 10),
	"guiSetter": "onValueChange",
	"initGUI": (option, control) =>
	{
		control.max_value = option.max;
		control.min_value = option.min;
	},
	"tooltip": (value, option) =>
		sprintf(translateWithContext("slider number", "Value: %(val)s (min: %(min)s, max: %(max)s)"), {
			"val": parseInt(value, 10),
			"min": parseInt(option.min, 10),
			"max": parseInt(option.max, 10)
		})
}

g_OptionType["autociv_number_int"] = {
	"objectType": "number",
	"configToValue": value => parseInt(value, 10),
	"valueToGui": (value, control) =>
	{
		control.caption = parseInt(value, 10);
	},
	"guiToValue": control => +control.caption,
	"guiSetter": "onTextEdit",
	"sanitizeValue": (value, control, option) =>
	{
		const min = parseInt(option.min, 10) ?? Number.MIN_SAFE_INTEGER
		const max = parseInt(option.max, 10) ?? Number.MAX_SAFE_INTEGER
		const sanitized = parseInt(value, 10) ?? 0
		const valid = Number.isInteger(value) && (min <= value) && (value <= max)

		if (control)
			control.sprite = valid ? "ModernDarkBoxWhite" : "ModernDarkBoxWhiteInvalid";

		return sanitized;
	},
	"tooltip": (value, option) =>
		sprintf(
			option.min !== undefined && option.max !== undefined ?
				translateWithContext("option number", "Min: %(min)s, Max: %(max)s") :
				option.min !== undefined && option.max === undefined ?
					translateWithContext("option number", "Min: %(min)s") :
					option.min === undefined && option.max !== undefined ?
						translateWithContext("option number", "Max: %(max)s") :
						"",
			{
				"min": parseInt(option.min, 10),
				"max": parseInt(option.max, 10)
			})
}

g_OptionType["autociv_dropdown_runtime_load"] = {
	"objectType": "dropdown",
	"configToValue": value => value,
	"valueToGui": (value, control) =>
	{
		control.selected = control.list_data.indexOf(value);
	},
	"guiToValue": control => control.list_data[control.selected],
	"guiSetter": "onSelectionChange",
	"initGUI": (option, control) =>
	{
		if (!option.list)
			option.list = global[option.autociv_list_load]()

		control.list = option.list.map(e => e.label);
		control.list_data = option.list.map(e => e.value);
		control.onHoverChange = () =>
		{
			let item = option.list[control.hovered];
			control.tooltip = item && item.tooltip || option.tooltip;
		};
	}
}

function autociv_getAvailableFonts()
{
	return Engine.ListDirectoryFiles("fonts/", "*").
		map(v => v.match(/fonts\/(.+)\.fnt/)?.[1]).
		filter(v => v).
		map(v => { return { "value": v, "label": v } })
}

if (!global.g_autociv_optionsFiles)
	var g_autociv_optionsFiles = ["gui/options/options.json"]
g_autociv_optionsFiles.push("autociv_data/options.json")

init = function (data, hotloadData)
{
	g_ChangedKeys = hotloadData ? hotloadData.changedKeys : new Set();
	g_TabCategorySelected = hotloadData ? hotloadData.tabCategorySelected : 0;

	// CHANGES START /////////////////////////
	g_Options = []
	for (let options of g_autociv_optionsFiles)
		Array.prototype.push.apply(g_Options, Engine.ReadJSONFile(options))
	// CHANGES END /////////////////////////

	translateObjectKeys(g_Options, ["label", "tooltip"]);

	// DISABLE IF DATA IS LOADED DYNAMICALLY
	// deepfreeze(g_Options);

	placeTabButtons(
		g_Options,
		false,
		g_TabButtonHeight,
		g_TabButtonDist,
		selectPanel,
		displayOptions);
}

/**
 * Sets up labels and controls of all options of the currently selected category.
 */
displayOptions = function ()
{
	// Hide all controls
	for (let body of Engine.GetGUIObjectByName("option_controls").children)
	{
		body.hidden = true;
		for (let control of body.children)
			control.hidden = true;
	}

	// Initialize label and control of each option for this category
	for (let i = 0; i < g_Options[g_TabCategorySelected].options.length; ++i)
	{
		// Position vertically
		let body = Engine.GetGUIObjectByName("option_control[" + i + "]");
		let bodySize = body.size;
		bodySize.top = g_OptionControlOffset + i * (g_OptionControlHeight + g_OptionControlDist);
		bodySize.bottom = bodySize.top + g_OptionControlHeight;
		body.size = bodySize;
		body.hidden = false;

		// Load option data
		let option = g_Options[g_TabCategorySelected].options[i];
		let optionType = g_OptionType[option.type];
		let value = optionType.configToValue(Engine.ConfigDB_GetValue("user", option.config));

		// Setup control
		let control = Engine.GetGUIObjectByName("option_control_" + (g_OptionType[option.type].objectType ?? option.type) + "[" + i + "]");
		control.tooltip = option.tooltip + (optionType.tooltip ? "\n" + optionType.tooltip(value, option) : "");
		control.hidden = false;

		if (optionType.initGUI)
			optionType.initGUI(option, control);

		control[optionType.guiSetter] = function () { };
		optionType.valueToGui(value, control);
		if (optionType.sanitizeValue)
			optionType.sanitizeValue(value, control, option);

		control[optionType.guiSetter] = function ()
		{

			let value = optionType.guiToValue(control);

			if (optionType.sanitizeValue)
				optionType.sanitizeValue(value, control, option);

			control.tooltip = option.tooltip + (optionType.tooltip ? "\n" + optionType.tooltip(value, option) : "");

			Engine.ConfigDB_CreateValue("user", option.config, String(value));
			Engine.ConfigDB_SetChanges("user", true);

			g_ChangedKeys.add(option.config);
			fireConfigChangeHandlers(new Set([option.config]));

			if (option.function)
				Engine[option.function](value);

			enableButtons();
		};

		// Setup label
		let label = Engine.GetGUIObjectByName("option_label[" + i + "]");
		label.caption = option.label;
		label.tooltip = option.tooltip;
		label.hidden = false;

		let labelSize = label.size;
		labelSize.left = option.dependencies ? g_DependentLabelIndentation : 0;
		labelSize.rright = control.size.rleft;
		label.size = labelSize;
	}

	enableButtons();
}


enableButtons = function ()
{
	g_Options[g_TabCategorySelected].options.forEach((option, i) =>
	{
		const isDependencyMet = (dependency) => {
			if (typeof dependency === "string")
				return Engine.ConfigDB_GetValue("user", dependency) == "true";
			else if (typeof dependency === "object") {
				const availableOps = {
				"==": (config, value) => config == value,
				"!=": (config, value) => config != value,
				};
				const op = availableOps[dependency.op] || availableOps["=="];
				return op(
				Engine.ConfigDB_GetValue("user", dependency.config),
				dependency.value
				);
			}
			error("Unsupported dependency: " + uneval(dependency));
			return false;
		};

    	const enabled = !option.dependencies || option.dependencies.every(isDependencyMet);

		const objectType = g_OptionType[option.type].objectType ?? option.type
		Engine.GetGUIObjectByName("option_label[" + i + "]").enabled = enabled;
		Engine.GetGUIObjectByName("option_control_" + objectType + "[" + i + "]").enabled = enabled;
	});

	let hasChanges = Engine.ConfigDB_HasChanges("user");
	Engine.GetGUIObjectByName("revertChanges").enabled = hasChanges;
	Engine.GetGUIObjectByName("saveChanges").enabled = hasChanges;

	const existingHandler = Engine.GetGUIObjectByName("saveChanges").onPress;
	// Create a new function that combines the existing handler and your code
	const combinedHandler = () => {
		// Call the existing handler first
		existingHandler();

		// restart / exit command is in follwoing function:
		check_modProfileSelector_settings()

		if(false) // not necesary anymore at the mometn.
		  try {
			Engine.Restart(1)
		  } catch (error) {
			Engine.Exit(1)
		  }
	};
	Engine.GetGUIObjectByName("saveChanges").onPress = combinedHandler;
}

function runAfterDelay() { // not work for me 23-0701_1334-21
	return new Promise(resolve => {
		setTimeout(() =>
		{
			warn( ' hi ho ')
		}, 1000)

		// setTimeout(resolve, 1000);
	});
  }


if(false){
  // outdated
  const key = "autocivP.gamesetup.restart"; // not needet try dont work in this case. use Engine.Exit(1) only
  let helloAllText = Engine.ConfigDB_GetValue("user", key);
  if(helloAllText == 'restart'){
    ConfigDB_CreateAndSaveValueA26A27("user", key, 'lalilu'); // should be a trick but restart not work if its from otther side. only if its the first call.
    try {
      Engine.Restart(1);
    } catch (error) {
      Engine.Exit(1)
    }
  }
}
// Engine.GetGUIObjectByName("saveChanges").onPress = () => warn("saveChanges")

var config = {
  needsToSave: false,
  needsToReloadHotkeys: false,
  set: function (key, value) {
    Engine.ConfigDB_CreateValue("user", key, value);
    this.needsToSave = true;
    this.needsToReloadHotkeys =
      this.needsToReloadHotkeys || key.startsWith("hotkey.");
  },
  get: function (key) {
    return Engine.ConfigDB_GetValue("user", key);
  },
  save: function () {
    if (this.needsToSave) {
      try {
        Engine.ConfigDB_SaveChanges("user"); // this is A27 style
      } catch (error) {
        Engine.ConfigDB_WriteFile("user", "config/user.cfg"); // this is A26 style
      }
    }

    // restart
    // try {
    //   Engine.Restart(1);
    // } catch (error) {
    //   Engine.Exit(1);
    // }



    if (this.needsToReloadHotkeys) Engine.ReloadHotkeys();
  },
};

function autociv_initCheck() {
  let state = {
    reasons: new Set(),
    showReadme: false,
    showSuggestDefaultChanges: false,
    showAutoFixModsOrder: true,
  };

  // Check settings
  {
    let settings = Engine.ReadJSONFile("moddata/autocivP_default_config.json"); // https://www.convertsimple.com/convert-ini-to-json/ if u want use your user.cfg (seeh, 23-0619_1559-06 )
    // Reset all autociv settings to default. Custom autociv settings added won't be affected.


    if(config.get('modProfile.showAutoFixModsOrder') === "true")
      state.showAutoFixModsOrder = true


    if (config.get("autociv.settings.reset.all2P") === "true")
      settings = Engine.ReadJSONFile("moddata/autocivP_default_config.json"); // https://www.convertsimple.com/convert-ini-to-json/ if u want use your user.cfg (seeh, 23-0619_1559-06 )
    if (config.get("autociv.settings.reset.all") === "true"
     || config.get("autociv.settings.reset.all2P") === "true"
    ) {
      warn("RESET ALL");
      for (const key in settings){
        const value = settings[key]
        // warn(`settings[key] = ${settings[key]}`)
        if(!(config.get("autociv.settings.reset.allowSuperKey") === "true")
          && value.length > 4 && value.includes('Super+'))
          {
            warn("Super key not allowed. You need allow SuperKey explicitly in your settings.");
            continue
          }
        config.set(key, value);
      }
      config.save();
      state.reasons.add("AutoCiv settings reset by user.");
      return state;
    }

    const allHotkeys = new Set(Object.keys(Engine.GetHotkeyMap()));
    // Normal check. Check for entries missing
    // if(g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
    //   warn('95: Normal check. Check for entries missing')
    // }

   if(false) {
    for (let key in settings) {
      if (key.startsWith("hotkey.")) {
        if (!allHotkeys.has(key.substring("hotkey.".length))) {
          config.set(key, settings[key]);
          state.reasons.add("New AutoCiv hotkey(s) added.");
        }
      } else if (config.get(key) == "") {
        config.set(key, settings[key]);
        state.reasons.add("New AutoCiv setting(s) added.");
      }
    }
  }


  }

  // Check for showSuggestDefaultChanges
  if(false) {
    {
    const key = "autociv.mainmenu.suggestDefaultChanges";
    if (config.get(key) == "true") {
      state.showSuggestDefaultChanges = true;
      config.set(key, "false");
    }
  }
  }

  // Check if show readme (first time user case)
  {
    const key = "autociv.settings.autociv_readme.seen";
    if (config.get(key) == "false") {
      state.showReadme = true;
      config.set(key, "true");
    }
  }

  config.save();
  return state;
}

Engine.SetGlobalHotkey("autociv.open.autociv_readme", "Press", () => {
  Engine.PushGuiPage("page_autociv_readme.xml");
});

autociv_patchApplyN("init", function (target, that, args) {
  let state = autociv_initCheck();
  if (state.reasons.size != 0) {
    let message = ["AutoCivP made some changes.\n"]
      .concat(Array.from(state.reasons).map((v) => ` · ${v}`))
      .join("\n");

    messageBox(
      500,
      300,
      message,
      "AutoCiv mod notice",
      ["Ok"],
      [() => {}, () => {}]
    );
  }


  const modsFromUserCfg_const = Engine.ConfigDB_GetValue(
    "user",
    "mod.enabledmods"
  );

  const modsBackup  = Engine.ConfigDB_GetValue(
    "user",
    "modProfile.backup "
  );

  const posProGUI = modsFromUserCfg_const.indexOf('proGUI')
  const posBoonGUI = modsFromUserCfg_const.indexOf('boonGUI')
  const posAutocivP = modsFromUserCfg_const.indexOf('autocivp')

  if (g_selfNick =="seeh" && state.showAutoFixModsOrder) { // quick lazy quick fix. TODO: fix this should be a in the options somwehere maybe

// some here like silhouettes true is much important for fair playing

ConfigDB_CreateAndSaveValueA26A27("user", "chat.timestamp", false);
ConfigDB_CreateAndSaveValueA26A27("user", "gui.session.timeelapsedcounter", true);
ConfigDB_CreateAndSaveValueA26A27("user", "gui.session.attackrange", true); // fairplay. its helps
ConfigDB_CreateAndSaveValueA26A27("user", "gui.session.aurasrange ", true); // fairplay. its helps
ConfigDB_CreateAndSaveValueA26A27("user", "overlay.realtime", false);
ConfigDB_CreateAndSaveValueA26A27("user", "autociv.session.playersOverlay.visible", true);
ConfigDB_CreateAndSaveValueA26A27("user", "autociv.session.statsOverlay.visible", false);
ConfigDB_CreateAndSaveValueA26A27("user", "session.showobservers", true);
ConfigDB_CreateAndSaveValueA26A27("user", "session.showstats", false);
ConfigDB_CreateAndSaveValueA26A27("user", "silhouettes", true);



    }

    // autocivP should be later than proGUI becouse the sepezial customr rating that should make the use use of proGUI visible 23-0722_1318-16
    // ConfigDB_CreateAndSaveValueA26A27("user", "customrating.readme_seen", true);

    // mod.enabledmods = "mod public kush-extreme localratings feldmap autocivp community-maps-2 10ad proGUI"

    if (true && posAutocivP < posProGUI) { // autocivP should be later than proGUI becouse the sepezial customrrating that should make the use use of proGUI visible 23-0722_1318-16

      warn(`posAutocivP < posProGUI = ${posAutocivP} < ${posProGUI}`)


      let clean = modsFromUserCfg_const
      /*NOTE - Allowing folder names to have optional postfixes for increased flexibility. Note that this approach is not recommended but can provide a better overview in certain cases.
      */
      const regex = /\bproGUI(.*?)\b/gi;
      const match = clean.match(regex);
      const postFixProGui = (match && match[1]) ? match[1] : '';

      const pattern = new RegExp(`\\bproGUI${postFixProGui}\\b`, 'gi');
      warn(`pattern = ${pattern}`)
      clean = clean.replace(pattern, '');
      clean = clean.replace(/\bautocivP\b(.*?)/gi, `proGUI${postFixProGui} autocivp$1 `);

      warn(`modsFromUserCfg_const = \n${modsFromUserCfg_const}`)
      warn(`new clean = \n${clean}`)

      ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods', clean.trim())

      const key = "autocivP.reloadcount"
      let reloadcount = parseInt( Engine.ConfigDB_GetValue("user", key) ) ;
      reloadcount = (reloadcount) ? reloadcount + 1 : 1
      warn(`reloadcount1 = ${reloadcount}`)
      ConfigDB_CreateAndSaveValueA26A27("user", key, reloadcount)

      if(reloadcount <= 2){
        try {
          Engine.Restart(1);
        } catch (error) {
          Engine.Exit(1)
        }
      }else{
        warn(`Please reporte to the mod developer: reloadcount = ${reloadcount}`)
      }

    }else{
      const key = "autocivP.reloadcount"
      ConfigDB_CreateAndSaveValueA26A27("user", key, 0)
    }















  if (true && state.showAutoFixModsOrder
    && posBoonGUI > 1 && posBoonGUI < posProGUI
    ) {

      // ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods',modsBackup) // guess this was not needed or mistake also 23-0722_1314-58

    let message = `
Mods sometimes work better when enabled in a special order.

Example of Jun  2023:
proGUI should first then boonGUI last if you want boonGUI (Jun 2023)
Do you want autofix some think (no guaranty for all)?
        `;

    messageBox(
      500,
      300,
      message,
      "AutoCivP mod autoOrderFix notice",
      ["Ok, change", "No"],
      [
        () => {

          let clean = modsFromUserCfg_const

          clean = clean.replaceAll(/\bproGUI\b /g, '');
          clean = clean.replaceAll(/\bboonGUI\b /g, 'proGUI boonGUI ');
          ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods',clean)

          try {
            Engine.Restart(1);
          } catch (error) {
            Engine.Exit(1)
          }



        },
        () => {},
      ]
    );
  }

  if (state.showSuggestDefaultChanges) {
    let message = `
Some default settings will improve with AutoCiv if changed.

Do you want to make these changes?

Disable hotkey:
"hotkey.camera.lastattackfocus" = "Space"

Add auto-queue hotkeys:
hotkey.session.queueunit.autoqueueoff = "Alt+W"
hotkey.session.queueunit.autoqueueon = "Alt+Q"
        `;

    messageBox(
      500,
      300,
      message,
      "AutoCiv mod notice",
      ["Ok, change", "No"],
      [
        () => {
          config.set("hotkey.camera.lastattackfocus", "");
          config.set("hotkey.session.queueunit.autoqueueoff", "Alt+W");
          config.set("hotkey.session.queueunit.autoqueueon", "Alt+Q");
          config.save();
        },
        () => {},
      ]
    );
  }

  if (state.showReadme) Engine.PushGuiPage("page_autociv_readme.xml");

  return target.apply(that, args);
});

// warn('check_modProfile_Settings()');


check_modProfileSelector_settings();
/**
 * IMPORTANT: Remember to update session/top_panel/BuildLabel.xml in sync with this.
 */




/**
 * Determines if the autocivP module has just been installed.
 * true when a checkbox is 'true' or 'false'
 * @return {boolean} Returns true if the autocivP module has just been installed, false otherwise.
 *
 * BTW ( 23-0803_1713-24 ):
Using a mix of camelCase and snake_case in long names can be a reasonable approach in certain cases. It can help improve readability and make the name more descriptive, especially if the name contains multiple words or phrases.

For example, if you have a long name like isAutoCivPJustNowInstalled, you could consider using a mix of camelCase and snake_case to make it more readable, like is_autoCivP_just_now_installed.

The key is to strike a balance between readability and consistency within the codebase. It's important to ensure that is clear and understandable to other developers who may be working on the codebase.
 */
function is_autocivP_just_now_installed(){


	// search for "type": "boolean", in  ***options***.json file/files

	/* ====> NOTE - dont use customrating becouse enabled by default <===

	*/


	const isValid_showStartWhenUsingProGUI = isCheckBox_valid_boolean_string("autocivP.mod.showStartWhenUsingProGUI")
	const isValid_showIconWhenUsingAutocivP = isCheckBox_valid_boolean_string("autocivP.mod.showIconWhenUsingAutocivP")
	const isValid_noUsernameInGameName = isCheckBox_valid_boolean_string("autocivP.gamesetup.noUsernameInGameName")
	const isValid_inNextFullMinuteRemove00 = isCheckBox_valid_boolean_string("autocivP.gamesetup.gameStart.inNextFullMinuteRemove00")
	const isValid_showModsInGameName = isCheckBox_valid_boolean_string(
		"autocivP.gamesetup.gameStart.showModsInGameName")
	// const is_setuped_valid_for_Remove00 = (isValid_inNextFullMinuteRemove00 === 'true' || isValid_inNextFullMinuteRemove00 === 'false')

	const isACheckboxValid =
	( isValid_showStartWhenUsingProGUI
		|| isValid_showIconWhenUsingAutocivP
		|| isValid_noUsernameInGameName
		|| isValid_inNextFullMinuteRemove00
		|| isValid_showModsInGameName )

		// g_selfNick =="seeh" &&
	if( !isACheckboxValid ){ //NOTE -developers want to see the error in the console
		// warn(`is_setuped_valid: ${isACheckboxValid}`)
		// warn(`==> inNextFullMinuteRemove00: ${isValid_inNextFullMinuteRemove00}`)

		// set something explicitly to false or true so we dont get an always its fresh installed true

		// true becouse showStartWhenUsingProGUI i great :)
		ConfigDB_CreateAndSaveValueA26A27("user", "autocivP.mod.showStartWhenUsingProGUI", 'true');

		const importantNote = "Some changes may require a restart of the game\n" +
		"(like when you change the mod profile).\n" +
		"Then the game may exit.\n" +
		"In such cases, it's your responsibility to start the game.\n" +
		"This is not a game crash. Thank you for understanding.\n\n" +
		"Not a bug, it's a feature ;)\n" +
		"If you have any questions, please feel free to ask. Thank you.";

		messageBox(
			500,
			300,
			importantNote,
			"Important Installation Note:\n",
			["Ok"],
			[() => {}, () => {}]
		  );


		// messageBox(
		// 	500,
		// 	300,
		// 	"Important Installation Note: Ensure AutocamP-FolderName is set to: autocivp . to prevent eventually errors. \n Lowercase without number to like",
		// 	"AutoCivP Installation Note",
		// 	["Ok"],
		// 	[() => {}, () => {}]
		//   );


	}
	return !(isACheckboxValid)

}

function isCheckBox_valid_boolean_string(booleanCheckboxName){
	const value = Engine.ConfigDB_GetValue(
		"user",
		booleanCheckboxName)
	// warn(`value = ${value}`)
	return (value === 'true' || value === 'false')
}


// Engine.BroadcastMessage("message", {   "message": "Changes saved",   "duration": 5  });`


setDefaultsInPersonalizationOnNewInstallation()

/**
 * Sets defaults in personalization on new installation.
 *
 * @return {undefined} No return value.
 */
function setDefaultsInPersonalizationOnNewInstallation(){
	if(is_autocivP_just_now_installed()){
		// set a example default value when the mod was never installed before
		// const value = 'Do you like: Auto-save Drafts in Chat? Never Lose Your Message Again'
		const value2 = '0 A.D. Friendly Tournament'
		ConfigDB_CreateAndSaveValueA26A27("user", 'autocivP.gamesetup.gameStart.string', value2);
		ConfigDB_CreateAndSaveValueA26A27("user", 'autocivP.msg.helloAll', 'hi all :)' );
		ConfigDB_CreateAndSaveValueA26A27("user", 'autocivP.msg.me', 'Do you like: Auto-save Drafts in Chat?' );
		ConfigDB_CreateAndSaveValueA26A27("user", 'autocivP.msg.meURL', 'https://www.youtube.com/@plan0go or search for plan0go' );
	}
}

/**
 * Retrieves the metadata for a replay.
 *
 * @return {Array} The replay metadata sorted by file modification time.
 */
function getReplayMetadata(){
	let replayList = Engine.GetReplays().sort(function(x,y){
		// warn(`x.fileMTime = ${x.fileMTime}`);
		// warn(`x.fileMTime = ${y.fileMTime}`);
		return x.fileMTime - y.fileMTime;
	});

	const replayListKeys = Object.keys(replayList);
	for (let key of replayListKeys) {
		warn(`key = ${key}`);
		const replayListKeys2 = Object.keys(replayListKeys[key]);
		for (let key2 of replayListKeys2) {
			warn(`   key2 = ${key2}`);
			warn(`   val2 = ${replayListKeys2[key2]}`);
			// const replayListKeys = Object.keys(replayList);
		}
		}
}
// getReplayMetadata()
// warn(`g_GameData.gui.replayDirectory = ${g_GameData.gui.replayDirectory}`);




function get_modsString() {
	let modsString = '';
	const modsObj = Engine.GetEngineInfo().mods
	for (let [key, value] of Object.entries(modsObj)) {
			if(key<1) continue;
			for (let [key2, value2] of Object.entries(Engine.GetEngineInfo().mods[key])) {
				if(key2 != 'name' && key2 != 'version') continue;
				modsString += ` ${value2}`; // mod/name/version : ...
			}
	}
	return modsString
}
let modsString = get_modsString()
var g_autocivPVersion = get_autocivPVersion()

const versionName = Engine.GetEngineInfo().mods[0]['name'];

if(versionName != '0ad')
	error(versionName + ' | ' +  versionOf0ad + '. name should by 0ad. hmmm. strange.');

modsString = modsString.replace(/\s+([a-z])/gi , "\n$1"  ) ;
modsString = modsString.replace(/\s+(proGUI)/g , "\n$1(boonGUI, BetterQuickStart)"  ) ;
modsString = modsString.replace(/\s+(autocivP)/gi , "\nAutoCivP(AutoCiv)"  ) ;
var g_ProjectInformation = {
	"organizationName": {
		"caption": translate("WILDFIRE GAMES")
	},
	"organizationLogo": {
		"sprite": "WildfireGamesLogo"
	},
	"productLogo": {
		"sprite": "0ADLogo"
	},
	"productBuild": {
		"caption": getBuildString()
	},
	"productDescription": {
		"caption":
		((modsString.length < 110 ) ? setStringTags(translate("Alpha XXVI: Zhuangzi"), { "font": "sans-bold-18" })   + "\n" : '')
		 +
		setStringTags(translate(modsString.trim(), { "font": "sans-16" }))
		 + "\n"
	}
};


// var g_ProjectInformation = {
// 	"organizationName": {
// 		"caption": translate("WILDFIRE GAMES")
// 	},
// 	"organizationLogo": {
// 		"sprite": "WildfireGamesLogo"
// 	},
// 	"productLogo": {
// 		"sprite": "0ADLogo"
// 	},
// 	"productBuild": {
// 		"caption": getBuildString()
// 	},
// 	"productDescription": {
// 		"caption": `${setStringTags(translate(modsString.trim(), { "font": "sans-16" }))
// 		 + "\n"
// 		 + setStringTags(translate(`autocivP ${Engine.GetEngineInfo().mods.find(obj => obj.name == "autocivP").version}`), { "font": "sans-16" })}`
// 		 + "\n"
// 	}
// };


var g_CommunityButtons = [

	{
		"caption": translate("Website"),
		"tooltip": translate("Click to open play0ad.com in your web browser."),
		"size": "8 100%-144 50%-4 100%-116",
		"onPress": () => {
			Engine.OpenURL("https://play0ad.com/");
		}
	},
	{
		"caption": translate("Chat"),
		"tooltip": translate("Click to open the 0 A.D. IRC chat in your browser (#0ad on webchat.quakenet.org). It is run by volunteers who do all sorts of tasks, it may take a while to get your question answered. Alternatively, you can use the forum (see Website)."),
		"size": "50%+4 100%-144 100%-8 100%-116",
		"onPress": () => {
			Engine.OpenURL("https://webchat.quakenet.org/?channels=0ad");
		}
	},
	{
		"caption": translate("Report a Bug"),





		"tooltip": translate("Click to visit 0 A.D. Trac to report a bug, crash, or error."),
		"size": "8 100%-108 50%-4 100%-80",
		"onPress": () => {
			Engine.OpenURL("https://trac.wildfiregames.com/wiki/ReportingErrors/");
		}
	},
	{
		"caption": translateWithContext("Frequently Asked Questions", "FAQ"),
		"tooltip": translate("Click to visit the Frequently Asked Questions page in your browser."),
		"size": "50%+4 100%-108 100%-8 100%-80",
		"onPress": () => {
			Engine.OpenURL("https://trac.wildfiregames.com/wiki/FAQ");
		}
	},
	{
		"caption": translate("Translate the Game"),
		"tooltip": translate("Click to open the 0 A.D. translate page in your browser."),
		"size": "8 100%-72 100%-8 100%-44",
		"onPress": () => {
			Engine.OpenURL("https://trac.wildfiregames.com/wiki/Localization");
		}
	},
	{
		"caption": translate("Donate"),
		"tooltip": translate("Help with the project expenses by donating."),
		"size": "8 100%-36 100%-8 100%-8",
		"onPress": () => {
			Engine.OpenURL("https://play0ad.com/community/donate/");
		}
	}
];






            // messageBox(
			// 	400, 200,
			// 	translate("need a resart"),
			// 	translate("eed a resart"),
			// 	[translate("Yes"), translate("Yes")],
			// 	[null, null]
			//   );
let g_proGUIPVersion = null;

/**
 * Whether we are attempting to join or host a game.
 * this file will proofed when you join a game
 */
var g_IsConnecting = false;

/**
 * "server" or "client"
 */
let g_GameType;

/**
 * Server title shown in the lobby gamelist.
 */
let g_ServerName = "";

/**
 * Identifier if server is using password.
 */
let g_ServerHasPassword = false;

let g_ServerId;

let g_IsRejoining = false;
let g_PlayerAssignments; // used when rejoining
let g_UserRating;
// added by custom rating
let g_PlayerName;

let g_LocalRatingsUser = null;


function init (attribs) {
    if (!attribs || !attribs.rating) {
        const currentRating = Engine.ConfigDB_GetValue("user", "UserRatingBackup"); // get backup
        g_UserRating = parseInt(currentRating) > 10 ? currentRating : '';
    } else {
        g_UserRating = attribs.rating;
        Engine.ConfigDB_CreateValue("user", "UserRatingBackup", attribs.rating);
        Engine.ConfigDB_WriteValueToFile("user", "UserRatingBackup", attribs.rating, "config/user.cfg"); // backup rating if rating-server is working
    }

    let customRating        = '';
    const usingCustomRating = getBoolOpt('customrating');
    const useLocalRatings   = getBoolOpt('autocivP.mod.useLocalRatings');
    // const showLocalRatings  = getBoolOpt('autocivP.mod.showLocalRatings');
    const showLocalRatingsDropdown  = Engine.ConfigDB_GetValue("user", "autocivP.mod.showLocalRatingsDropdown");


    const hasLocalRatings   = typeof init_LocalRatings != 'undefined';

    let bugIt = false // new implementation so i will watch longer
	// bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer

    if(bugIt)
        info('showLocalRatingsDropdown:', showLocalRatingsDropdown,'showLocalRatingsDropdown:', showLocalRatingsDropdown, 'hasLocalRatings:', hasLocalRatings);


    if(!hasLocalRatings){
        if ( (useLocalRatings || showLocalRatingsDropdown) ){
            error(`for using local ratings you need to enable to LocalRatings mod`);
        }
    }
    else if (hasLocalRatings && (useLocalRatings || showLocalRatingsDropdown)) {
        info('try to use local ratings database, with user: ', g_selfNick);
        g_LocalRatingsUser = init_LocalRatings()[g_selfNick];

        // if you want add g_LocalRatingsUser.matches but i feels its to long for usernames
        if (g_LocalRatingsUser) {

            if(showLocalRatingsDropdown == '^lr')
                g_LocalRatingsUser = g_UserRating + '|' + (g_LocalRatingsUser.rating * 100).toFixed(2);

            if(showLocalRatingsDropdown == '^lr_PlusGames')
                g_LocalRatingsUser = g_UserRating + '|' + (g_LocalRatingsUser.rating * 100).toFixed(2)
                + '|' + g_LocalRatingsUser.matches;

            if(showLocalRatingsDropdown == '^lr_NoNormalRating')
                g_LocalRatingsUser = (g_LocalRatingsUser.rating * 100).toFixed(2);

            if(showLocalRatingsDropdown == '^lr_NoNormalRating_PlusGames')
                g_LocalRatingsUser = (g_LocalRatingsUser.rating * 100).toFixed(2)
                + '|' + g_LocalRatingsUser.matches;


        }

        // warn(`g_LocalRatingsUser: ${g_LocalRatingsUser}`);
        // warn(`showLocalRatingsDropdown: ${showLocalRatingsDropdown}`);

        info('g_LocalRatingUser:', g_LocalRatingsUser);
    }

    for (const [key, value] of Object.entries(Engine.GetEngineInfo().mods)) {
        if (value.name === "proGUI") {
            g_proGUIPVersion = value.version
        break
        }
    }

    if (usingCustomRating) {
        const appendToCustomRating = getBoolOpt('autocivP.mod.appendToCustomRating');
        const optionsCustomRating  = {
            '^n':    'nuub',
            '^vn':   'very nub',
            '^0':    'youtuber',
            '^1':    'unfocused today',
            '^2':    ' rated',
            '^3':    ' unrated',
            '^4':    ' programmer\?',
            '^5':    ' spec',
            '^6':    ' spec\=i not play',
            '^7':    ' ill today',
            '^8':    ' overrated',
            '^9':    ' underrated',
            'false': ' '
        };

        customRating = getOpt('autocivP.customUsernameDropdown');
        info('proGUI:', g_proGUIPVersion, 'customrating:', customRating);

        customRating = optionsCustomRating[customRating] || customRating;
        customRating = customRating.replace(/^[^\d\w\-]*[0-9]+[^\d\w\-]*$/g, '');
        customRating = customRating.length > 1 ? customRating : getOpt('customrating.string');
        info('customrating:', customRating);

        if (appendToCustomRating) {
            const useItWithoutUnicode       = getBoolOpt('autociv.chatText.font.useItWithoutUnicode');
            const showStartWhenUsingProGUI   = getBoolOpt('autocivP.mod.showStartWhenUsingProGUI');
            const showIconWhenUsingAutocivP = getBoolOpt('autocivP.mod.showIconWhenUsingAutocivP');

            customRating = [
                g_LocalRatingsUser && showLocalRatingsDropdown ? g_LocalRatingsUser : g_UserRating,
                (!g_proGUIPVersion ? '' : (showStartWhenUsingProGUI ?
                    (useItWithoutUnicode ? '*' : "♤") : 'proGUI'))
                    +
                    (showIconWhenUsingAutocivP ?  (useItWithoutUnicode ? 'AP' : '♇') : ''),
                customRating.trim()
            ].filter(Boolean).join('|');

            if(customRating)
                customRating = customRating.replace(/\|([^\d\w\-])/, '$1'); // remove a pipe, when its still good to read, becouse name is sometimes a bit long

            info(
              'customrating:', customRating,
              'useItWithoutUnicode:', useItWithoutUnicode,
              'showStartWhenUsingProGUI:', showStartWhenUsingProGUI,
              'showIconWhenUsingAutocivP:', showIconWhenUsingAutocivP,
              'showLocalRatings:', showLocalRatingsDropdown,
              'hasLocalRatings:', hasLocalRatings
            );
        }
    }

    customRating = customRating.length > 0 ? customRating : g_UserRating +'';
    customRating = customRating.length > 24 ? customRating.substring(0,24) +'..' : customRating;
    g_UserRating = getRatings(customRating);
    g_PlayerName = !!attribs.name ? attribs.name + (g_UserRating.length > 0 ? ` (${g_UserRating})` : '') : '';

    info(
        'attribs.name:', attribs.name,
        'g_UserRating:', g_UserRating,
        'g_GameType:', g_GameType,
        'g_PlayerName:', g_PlayerName
    );

    // added by custom rating - END
    switch (attribs.multiplayerGameType) {
        case "join": {
            if (!Engine.HasXmppClient()) {
                switchSetupPage("pageJoin");
                break;
            }
            if (attribs.hasPassword) {
                g_ServerName = attribs.name;
                g_ServerId = attribs.hostJID;
                switchSetupPage("pagePassword");
            } else if (startJoinFromLobby(attribs.name, attribs.hostJID, ""))
                switchSetupPage("pageConnecting");
            break;
        }
        case "host": {
            let hasXmppClient = Engine.HasXmppClient();
            Engine.GetGUIObjectByName("hostSTUNWrapper").hidden = !hasXmppClient;
            Engine.GetGUIObjectByName("hostPasswordWrapper").hidden = !hasXmppClient;
            if (hasXmppClient) {
                Engine.GetGUIObjectByName("hostPlayerName").caption = attribs.name;
                Engine.GetGUIObjectByName("hostServerName").caption =
                    sprintf(translate("%(name)s's game"), {"name": attribs.name});

                Engine.GetGUIObjectByName("useSTUN").checked = Engine.ConfigDB_GetValue("user", "lobby.stun.enabled") == "true";
            }

            switchSetupPage("pageHost");
            break;
        }
        default:
            error("Unrecognised multiplayer game type: " + attribs.multiplayerGameType);
            break;
    }
}


function info (...args) {
    const shouldDebug = getBoolOpt('autociv.settings.debug');

    if (!shouldDebug)
        return;

    const stack = (new Error()).stack.toString().split(/\r\n|\n/);

    warn(' [i] '+ stack[1] + '  '+ args.join(' '));
}

function getBoolOpt (option, context) {
    return getOpt(option, context) === 'true';
}

function getOpt (option, context) {
    context = context || 'user';
    return Engine.ConfigDB_GetValue(context, option);
}

function getRatings (currentRating) {
    const useLocalRatings = getBoolOpt('autocivP.mod.useLocalRatings');

    currentRating = (currentRating || '').length > 0 ? currentRating || '' : '';

    info('curentRating:', currentRating, 'useLocalRatings:', useLocalRatings);

    return ((g_LocalRatingsUser && useLocalRatings) ? g_LocalRatingsUser : currentRating).trim();
}

function cancelSetup() {
    if (g_IsConnecting)
        Engine.DisconnectNetworkGame();

    if (Engine.HasXmppClient())
        Engine.LobbySetPlayerPresence("available");

    // Keep the page open if an attempt to join/host by ip failed
    if (!g_IsConnecting || (Engine.HasXmppClient() && g_GameType == "client")) {
        Engine.PopGuiPage();
        return;
    }

    g_IsConnecting = false;
    Engine.GetGUIObjectByName("hostFeedback").caption = "";

    if (g_GameType == "client")
        switchSetupPage("pageJoin");
    else if (g_GameType == "server")
        switchSetupPage("pageHost");
    else
        error("cancelSetup: Unrecognised multiplayer game type: " + g_GameType);
}

function confirmPassword() {
    if (Engine.GetGUIObjectByName("pagePassword").hidden)
        return;
    if (startJoinFromLobby(g_ServerName, g_ServerId, Engine.GetGUIObjectByName("clientPassword").caption))
        switchSetupPage("pageConnecting");
}

function confirmSetup() {
    if (!Engine.GetGUIObjectByName("pageJoin").hidden) {
        let joinPlayerName = Engine.GetGUIObjectByName("joinPlayerName").caption;
        let joinServer = Engine.GetGUIObjectByName("joinServer").caption;
        let joinPort = Engine.GetGUIObjectByName("joinPort").caption;

        if (startJoin(joinPlayerName, joinServer, getValidPort(joinPort)))
            switchSetupPage("pageConnecting");
    } else if (!Engine.GetGUIObjectByName("pageHost").hidden) {
        let hostServerName = Engine.GetGUIObjectByName("hostServerName").caption;
        if (!hostServerName) {
            Engine.GetGUIObjectByName("hostFeedback").caption = translate("Please enter a valid server name.");
            return;
        }

        let hostPort = Engine.GetGUIObjectByName("hostPort").caption;
        if (getValidPort(hostPort) != +hostPort) {
            Engine.GetGUIObjectByName("hostFeedback").caption = sprintf(
                translate("Server port number must be between %(min)s and %(max)s."), {
                    "min": g_ValidPorts.min,
                    "max": g_ValidPorts.max
                });
            return;
        }

        let hostPlayerName = Engine.GetGUIObjectByName("hostPlayerName").caption;
        let hostPassword = Engine.GetGUIObjectByName("hostPassword").caption;
        if (startHost(hostPlayerName, hostServerName, getValidPort(hostPort), hostPassword))
            switchSetupPage("pageConnecting");
    }
}

function startConnectionStatus(type) {
    g_GameType = type;
    g_IsConnecting = true;
    g_IsRejoining = false;
    Engine.GetGUIObjectByName("connectionStatus").caption = translate("Connecting to server...");
}

function onTick() {
    if (!g_IsConnecting)
        return;

    pollAndHandleNetworkClient();
}

function getConnectionFailReason(reason) {
    switch (reason) {
        case "not_server":
            return translate("Server is not running.");
        case "invalid_password":
            return translate("Password is invalid.");
        case "banned":
            return translate("You have been banned.");
        case "local_ip_failed":
            return translate("Failed to get local IP of the server (it was assumed to be on the same network).");
        default:
            warn("Unknown connection failure reason: " + reason);
            return sprintf(translate("\\[Invalid value %(reason)s]"), {"reason": reason});
    }
}

function reportConnectionFail(reason) {
    messageBox(
        400, 200,
        (translate("Failed to connect to the server.")
        ) + "\n\n" + getConnectionFailReason(reason),
        translate("Connection failed")
    );
}

function pollAndHandleNetworkClient() {
    while (true) {
        var message = Engine.PollNetworkClient();
        if (!message)
            break;

        log(sprintf(translate("Net message: %(message)s"), {"message": uneval(message)}));
        // If we're rejoining an active game, we don't want to actually display
        // the game setup screen, so perform similar processing to gamesetup.js
        // in this screen
        if (g_IsRejoining) {
            switch (message.type) {
                case "serverdata":
                    switch (message.status) {
                        case "failed":
                            cancelSetup();
                            reportConnectionFail(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "netstatus":
                    switch (message.status) {
                        case "disconnected":
                            cancelSetup();
                            reportDisconnect(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "players":
                    g_PlayerAssignments = message.newAssignments;
                    break;

                case "start":
                    Engine.SwitchGuiPage("page_loading.xml", {
                        "attribs": message.initAttributes,
                        "isRejoining": g_IsRejoining,
                        "playerAssignments": g_PlayerAssignments
                    });

                    // Process further pending netmessages in the session page
                    return;

                case "chat":
                    break;

                case "netwarn":
                    break;

                default:
                    error("Unrecognised net message type: " + message.type);
            }
        } else
            // Not rejoining - just trying to connect to server.
        {
            switch (message.type) {
                case "serverdata":
                    switch (message.status) {
                        case "failed":
                            cancelSetup();
                            reportConnectionFail(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "netstatus":
                    switch (message.status) {
                        case "connected":
                            Engine.GetGUIObjectByName("connectionStatus").caption = translate("Registering with server...");
                            break;

                        case "authenticated":
                            if (message.rejoining) {
                                Engine.GetGUIObjectByName("connectionStatus").caption = translate("Game has already started, rejoining...");
                                g_IsRejoining = true;
                                return; // we'll process the game setup messages in the next tick
                            }
                            Engine.SwitchGuiPage("page_gamesetup.xml", {
                                "serverName": g_ServerName,
                                "hasPassword": g_ServerHasPassword
                            });
                            return; // don't process any more messages - leave them for the game GUI loop

                        case "disconnected":
                            cancelSetup();
                            reportDisconnect(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "netwarn":
                    break;

                default:
                    error("Unrecognised net message type: " + message.type);
                    break;
            }
        }
    }
}

function switchSetupPage(newPage) {
    let multiplayerPages = Engine.GetGUIObjectByName("multiplayerPages");
    for (let page of multiplayerPages.children)
        if (page.name.startsWith("page"))
            page.hidden = true;

    if (newPage == "pageJoin" || newPage == "pageHost") {
        let pageSize = multiplayerPages.size;
        let halfHeight = newPage == "pageJoin" ? 145 : Engine.HasXmppClient() ? 140 : 125;
        pageSize.top = -halfHeight;
        pageSize.bottom = halfHeight;
        multiplayerPages.size = pageSize;
    } else if (newPage == "pagePassword") {
        let pageSize = multiplayerPages.size;
        let halfHeight = 60;
        pageSize.top = -halfHeight;
        pageSize.bottom = halfHeight;
        multiplayerPages.size = pageSize;
    }

    Engine.GetGUIObjectByName(newPage).hidden = false;

    Engine.GetGUIObjectByName("hostPlayerNameWrapper").hidden = Engine.HasXmppClient();
    Engine.GetGUIObjectByName("hostServerNameWrapper").hidden = !Engine.HasXmppClient();

    Engine.GetGUIObjectByName("continueButton").hidden = newPage == "pageConnecting" || newPage == "pagePassword";
}

function startHost(playername, servername, port, password) {
    startConnectionStatus("server");

    Engine.ConfigDB_CreateAndWriteValueToFile("user", "playername.multiplayer", playername, "config/user.cfg");

    Engine.ConfigDB_CreateAndWriteValueToFile("user", "multiplayerhosting.port", port, "config/user.cfg");

    let hostFeedback = Engine.GetGUIObjectByName("hostFeedback");

    // Disallow identically named games in the multiplayer lobby
    if (Engine.HasXmppClient() &&
        Engine.GetGameList().some(game => game.name == servername)) {
        cancelSetup();
        hostFeedback.caption = translate("Game name already in use.");
        return false;
    }

    let useSTUN = Engine.HasXmppClient() && Engine.GetGUIObjectByName("useSTUN").checked;

    try {
        Engine.StartNetworkHost(playername + (g_UserRating ? " (" + g_UserRating + ")" : ""), port, useSTUN, password);
    } catch (e) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf(translate("Cannot host game: %(message)s."), {"message": e.message}),
            translate("Error")
        );
        return false;
    }

    g_ServerName = servername;
    g_ServerHasPassword = !!password;

    if (Engine.HasXmppClient())
        Engine.LobbySetPlayerPresence("playing");

    return true;
}

/**
 * Connect via direct IP (used by the 'simple' MP screen)
 */
function startJoin(playername, ip, port) {
    try {
        Engine.StartNetworkJoin(playername, ip, port);
    } catch (e) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf(translate("Cannot join game: %(message)s."), {"message": e.message}),
            translate("Error")
        );
        return false;
    }

    startConnectionStatus("client");

    // Future-proofing: there could be an XMPP client even if we join a game directly.
    if (Engine.HasXmppClient())
        Engine.LobbySetPlayerPresence("playing");

    // Only save the player name and host address if they're valid.
    Engine.ConfigDB_CreateAndWriteValueToFile("user", "playername.multiplayer", playername, "config/user.cfg");
    Engine.ConfigDB_CreateAndWriteValueToFile("user", "multiplayerserver", ip, "config/user.cfg");
    Engine.ConfigDB_CreateAndWriteValueToFile("user", "multiplayerjoining.port", port, "config/user.cfg");
    return true;
}

/**
 * Connect via the lobby.
 */
function startJoinFromLobby(playername, hostJID, password) {
    if (!Engine.HasXmppClient()) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf("You cannot join a lobby game without logging in to the lobby."),
            translate("Error")
        );
        return false;
    }

    try {
        Engine.StartNetworkJoinLobby(playername + (g_UserRating ? " (" + g_UserRating + ")" : ""), hostJID, password);
    } catch (e) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf(translate("Cannot join game: %(message)s."), {"message": e.message}),
            translate("Error")
        );
        return false;
    }

    startConnectionStatus("client");

    Engine.LobbySetPlayerPresence("playing");

    return true;
}

function getDefaultGameName() {
    return sprintf(translate("%(playername)s's game"), {
        "playername": multiplayerName()
    });
}

function getDefaultPassword() {
    return "";
}
autociv_patchApplyN("init", (target, that, args) => {
    const res = target.apply(that, args);
    const [attribs] = args

    if(false && g_selfNick =="seeh"){ // programmer need to see bit more info
      warn("6: attribs:", attribs)
      warn("7: typeof attribs:", typeof attribs) // typeof attribs give no result
      warn("7: attribs.rating:", attribs.rating) // give no result
      warn("7: attribs.rating:", attribs.rating) // give no result
      warn("7: (attribs.rating):", (attribs.rating)) // give no result
      warn("7: { attribs }:", { attribs }) // give no result
      warn("7: Object.keys(attribs):", Object.keys(attribs) ) // give no result
      for (let i = 0; i < attribs.length; i++) {
          warn(i); // Output: 0, 1, 2
      }         // give no result
      // it never gives me any results? when it gives results? 23-0730_2229-20
    }


    if (attribs.hasPassword)
    {
        let input = Engine.GetGUIObjectByName("clientPassword");
        input.blur()
        input.focus()
        input.buffer_position = input.caption.length;
        input.onPress = () => confirmPassword()
    }
    else if (attribs.multiplayerGameType == "host")
    {
        let input = Engine.GetGUIObjectByName("hostServerName");
        input.blur()
        input.focus()
        if(false && Engine.Config_selfNick =="seeh")
            input.caption = '♡mods: proGUI(bot?) autocivP(audio,setups) localRatings GodsEye(setups) ... ♡ YouTube LiveStreaming';

        else{
            const modEnabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);

      const customrating_trueFalse = Engine.ConfigDB_GetValue("user", "customrating");
      const isCustomratingEnabled = ( customrating_trueFalse === "true" )
      let text = ''
      const gameStartSuggestionKey = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey"
        );
      const gameStartSuggestionKey1 = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey1"
        );
      const gameStartSuggestionKey2 = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey2"
        );
      const gameStartSuggestionKey3 = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey3"
        );
      let gameStartSuggestion_value = ''
      // The variations 'nub' and 'nuub' are alternative spellings of 'noob' and are commonly used in online communities or forums.
      if(isCustomratingEnabled && gameStartSuggestionKey.trim().length > 0){
        let value = ''
        value = (gameStartSuggestionKey == '^1') ? "learn/teach/talk game" : value
        value = (gameStartSuggestionKey == '^2') ? "TotalGames>10" : value
        value = (gameStartSuggestionKey == '^3') ? "waiting for friends" : value
        value = (gameStartSuggestionKey == '^4') ? "YouTube" : value
        value = (gameStartSuggestionKey == '\^4yl') ? "YouTube Lifestream: plan0go" : value
        value = (gameStartSuggestionKey == '^5') ? "must have: progGUI, feldmap" : value
        value = (gameStartSuggestionKey == '^5b') ? "must have: progGUI, autocivP, feldmap" : value
        value = (gameStartSuggestionKey == '^0') ? "must have: progGUI, autocivP" : value
        value = (gameStartSuggestionKey == '^6') ? "spec. not play!" : value
        value = (gameStartSuggestionKey == '^7') ? "not seriously. only a game" : value
        value = (gameStartSuggestionKey == '^8') ? "Rules: 1. enable autocivP mods, 2. use Jitsi-Audio-Chat later" : value
        value = (gameStartSuggestionKey == '^9') ? "Rules: 1. enable autocivP, proGUI mods, 2. use Jitsi-Audio-Chat later 3. use share Resources with your friends later" : value
        value = (gameStartSuggestionKey == '^a') ? "game for drunken idiots - ping me by typing my name": value
        value = (gameStartSuggestionKey == '^b') ? "1v1 - random map, join by typing my name , wait 1min, i say hi, ... , start": value
        value = (gameStartSuggestionKey == '^c') ? "double speed": value
        value = (gameStartSuggestionKey == '^d') ? "normal random map - no Cheats": value
        value = (gameStartSuggestionKey == '^e') ? "1v1, 2v2 random map": value
        value = (gameStartSuggestionKey == '^f') ? "2xSpeed randomMap - don't EXIT": value
        value = (gameStartSuggestionKey == '^g') ? "2xSpeed CheatsNO randomMap - don't EXIT->ResignFirst thanks": value
        value = (gameStartSuggestionKey == '^h') ? "use Map 'Extinct Volcano'. it has something like timeout inside. Default is 25 Minutes": value
        value = (gameStartSuggestionKey == '^i') ? "talk and optional TG later": value
        value = (gameStartSuggestionKey == '^j') ? "can you do me a favor and test my latest mod update with me? please load new modificatoin from githup first": value
        value = (gameStartSuggestionKey == '^k') ? "can you do me a favor and test the chat draft function of my latest mod with me? please load new modificatoin first": value
        value = (gameStartSuggestionKey == '^l') ? "Mod Update Testing Party": value
        value = (gameStartSuggestionKey == '^m') ? "New Mod Modification Showcase": value

        value = (gameStartSuggestionKey == '^t1') ? "1 player more for the tournament next week. My team of 4 is looking forward to it.": value
        value = (gameStartSuggestionKey == '^t2') ? "2 player more for the tournament next week. My team of 4 is looking forward to it.": value
        value = (gameStartSuggestionKey == '^t3') ? "3 player more for the tournament next week. My team of 4 is looking forward to it.": value

        gameStartSuggestion_value += `|${value}`
        // end of key exist
      }

      const gameStartSuggestion_string = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.string"
        );
        // warn(`95: gameStartSuggestion_string: ${gameStartSuggestion_string}`)
        if(gameStartSuggestion_string.length > 0){
          gameStartSuggestion_value += gameStartSuggestion_string // example: Hi :) Do you like: Auto-save Drafts in Chat? Never Lose Your Message Again
        }


      if(isCustomratingEnabled && gameStartSuggestionKey2 !== 'false' && gameStartSuggestionKey2.trim().length > 0){
        let value = ''
        value = (gameStartSuggestionKey2 == '^1') ? "1v1" : value
        value = (gameStartSuggestionKey2 == '^2') ? "2v2" : value
        value = (gameStartSuggestionKey2 == '^3') ? "3v3, 4v4" : value
        gameStartSuggestion_value += `|${value}|`
      }else{

        const useRatedDefaultInGameName = ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.useRatedDefaultInGameName") === "true" )

        if(useRatedDefaultInGameName){
          const isRatedDefault = ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.ratedDefault") === "true" )
          gameStartSuggestion_value += (isRatedDefault) ? '|rated|' :  '|unrated|' // is not expicited set in the options so suggest what rated default is
        }

      }
      if(isCustomratingEnabled && gameStartSuggestionKey3.trim().length > 0){
        let value = ''
        value = (gameStartSuggestionKey3 == '^1') ? "pingMe" : value
        gameStartSuggestion_value += `${value}|`
      }

            const lenFirst = input.caption.length
            const gameStartTime = nextGameStartTime()

            const modsInGameName
              = Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.gameStart.showModsInGameName") == "true"
              ? `| ${modEnabledmods.slice(11,)} ← Mods I'm currently using`
              : ''

            if(gameStartTime)
              text = `${gameStartSuggestion_value} ${nextGameStartTime()} ${modsInGameName}`
            else
              text = `${gameStartSuggestion_value} ${modsInGameName}`
            // input.caption = nextGameStartTime()


            // warn(`109: ${g_GameType} = g_GameType`)
            // g_GameType undifined when local game name will be edited. game setup window will be opened soon
            // g_GameType undifined again when in the game setup window
            // g_GameType undifined again when in the game setup window
            // g_GameType no message ingame then

            if ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.noUsernameInGameName") == "true" ){
              // if(g_selfNick =="seeh") //NOTE - developers
              //   warn(`109: ${text} = text`)
              text = text.replace(/^[\| ]*(.*?)[\| ]*$/, "$1"); // trim from leading of ending | delimiters
              input.caption = text // for some reason this was not inserted in a local game name setup. not sure why and not big problem. dont want to fix it 23-0724_1309-330
              // if(g_selfNick =="seeh") //NOTE - developers
              //   warn(`112: ${text} = text`)
            }else{
              text = text.replace(/[\| ]*$/, ""); // trim from ending | delimiters
              input.caption += text
              input.buffer_position = lenFirst
            }
            // input.caption += nextGameStartTime()
            // input.caption = nextGameStartTime()

    }

        // input.buffer_position = input.caption.length;
        input.onPress = () => confirmSetup()
    }
    return res
})

function nextGameStartTime() {


  let inNextFullMinute = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.gamesetup.gameStart.inNextFullMinute"
    );

  let showCountrysCode = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.gamesetup.gameStart.inNextFullMinuteCountrys"
    );


    // autocivP.gamesetup.gameStart.inNextFullMinuteRemove00
    const remove00 = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.gamesetup.gameStart.inNextFullMinuteRemove00"
    );


  if(inNextFullMinute.length < 1 || isNaN(inNextFullMinute))
    return false

    const getNextHalfHour = (inNextFullMinute) => {
      const now = new Date();
      const nowMinutes = now.getMinutes();



      if(!inNextFullMinute && isNaN(inNextFullMinute))
        inNextFullMinute = 30
      else inNextFullMinute = parseInt(inNextFullMinute)

      const roundedMinutes = Math.ceil(minutes / inNextFullMinute) * inNextFullMinute;
      const nextHalfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinutes, 0);
      if (roundedMinutes === 60) {
        nextHalfHour.setHours(now.getHours() + 1);
        nextHalfHour.setMinutes(0);
      }
      return nextHalfHour;
    };

    const formatTime = (date, timeZone) => {
      const options = {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone,
      };
      return date.toLocaleTimeString('en-US', options);
    };

    const nextHalfHour = getNextHalfHour();

    // const gameStartTimeGMT = formatTime(nextHalfHour, 'GMT'); // same like 'Europe/London'

        // const message = `${gameStartTimeEU.split(':').slice(0, 2).join(':')} EU/Berlin, ${gameStartTimeIndian.split(':').slice(0, 2).join(':')} IST, ${gameStartTimeET.split(':').slice(0, 2).join(':')} ET, ${gameStartTimePT.split(':').slice(0, 2).join(':')} PT`; // GMT is same like europa london

        // nut totally sure if this source is really correct. i tried to geht help here:
        // https://stackoverflow.com/questions/76767940/es6-formattime-for-asia-kolkata-and-funplanat-moon-gives-always-the-same-result

        const Latvia = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/London');

    const tBerlinLondonSwedenDenmark = formatTime(nextHalfHour, 'Europe/London');

    // const tSweden = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Stockholm');
    const tGreece = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Athens');

    const Asia_Kolkata = formatTime(new Date(nextHalfHour.getTime() + (3.5 * 60 * 60 * 1000)), 'Asia/Kolkata');
    const USA_ET = formatTime(new Date(nextHalfHour.getTime() - (6 * 60 * 60 * 1000)), 'America/New_York');
    const USA_Los_Angeles = formatTime(new Date(nextHalfHour.getTime() - (9 * 60 * 60 * 1000)), 'America/Los_Angeles');
    const USA_Chicago = formatTime(new Date(nextHalfHour.getTime() - (7 * 60 * 60 * 1000)), 'America/Los_Angeles');

    const Mexiko = formatTime(new Date(nextHalfHour.getTime() - (8 * 60 * 60 * 1000)), 'Europe/London');

    const RioGrandeDoSulBrasilien = formatTime(new Date(nextHalfHour.getTime() - (5 * 60 * 60 * 1000)), 'Europe/London');

    if(true){

        // check its correct to london
        // const sweden = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Stockholm');
        // const greece = formatTime(new Date(nextHalfHour.getTime() + (2 * 60 * 60 * 1000)), 'Europe/Athens');

        // const Asia_Kolkata = formatTime(new Date(nextHalfHour.getTime() + (4.5 * 60 * 60 * 1000)), 'Asia/Kolkata');
        // const USA_ET = formatTime(new Date(nextHalfHour.getTime() - (5 * 60 * 60 * 1000)), 'America/New_York');
        // const USA_PT = formatTime(new Date(nextHalfHour.getTime() - (8 * 60 * 60 * 1000)), 'America/Los_Angeles');

    }

    // compare here: https://www.timeanddate.com/time/zone/usa
    let message =''

    if(!showCountrysCode || showCountrysCode === 'all')
      showCountrysCode = 'LatviaLondonAthensKolkataChicagoNewYorkLosAngelesMexikoRioGrandeDoSul';
    if(showCountrysCode.indexOf('London') > -1)
      message += ` ${tBerlinLondonSwedenDenmark.split(':').slice(0, 2).join(':')} Berlin`;
    if(showCountrysCode.indexOf('Latvia') > -1)
      message += ` ${Latvia.split(':').slice(0, 2).join(':')} Latvia`;
    if(showCountrysCode.indexOf('Athens')>-1)
      message += ` ${tGreece.split(':').slice(0, 2).join(':')} Greece`;
    if(showCountrysCode.indexOf('Kolkata')>-1)
      message += ` ${Asia_Kolkata.split(':').slice(0, 2).join(':')} KolkataAsia`;
    if(showCountrysCode.indexOf('Chicago')>-1)
      message += ` ${USA_Chicago.split(':').slice(0, 2).join(':')} Chicago`;
    if(showCountrysCode.indexOf('NewYork')>-1)
      message += ` ${USA_ET.split(':').slice(0, 2).join(':')} NewYork`;
    if(showCountrysCode.indexOf('LosAngeles')>-1)
      message += ` ${USA_Los_Angeles.split(':').slice(0, 2).join(':')} LosAngeles`;
    if(showCountrysCode.indexOf('Mexiko')>-1)
      message += ` ${Mexiko.split(':').slice(0, 2).join(':')} Mexiko`;
    if(showCountrysCode.indexOf('RioGrandeDoSul')>-1)
      message += ` ${RioGrandeDoSulBrasilien.split(':').slice(0, 2).join(':')} RioGrandeBrasil`;


    if(remove00) // autocivP.gamesetup.gameStart.inNextFullMinuteRemove00
      return message.replace(/\:00/g,'');

    // warn(message)
    return message;
    // 3:30 PM EU/Berlin time, 8:00 PM IST for Indian players, 9:30 AM ET, 6:30 AM PT, 2:30 PM GMT
  }
/*!SECTIONS
const versionOf0ad = Engine.GetEngineInfo().mods[0]['version']; // 0.0.26

probably not needed here anymore, becouse of this 23-0724_1503-25
TIMER| hotkeys/sprites.xml: 39.13 us
ERROR: JavaScript error: gui/hotkeys/HotkeysPage~autociv.js line 1
redeclaration of const versionOf0ad
  @gui/hotkeys/HotkeysPage~autociv.js:1:1
  onPress@gui/pregame/MainMenuItems.js:225:13
  performButtonAction@gui/pregame/MainMenuItemHandler.js:77:9
  pressButton@gui/pregame/MainMenuItemHandler.js:63:10
TIMER| hotkeys/hotkeys.xml: 59.0303 ms
*/


autociv_patchApplyN(HotkeysPage.prototype, "saveUserHotkeys", function (target, that, args)
{
    const res = target.apply(that, args);

    let temp = {}
    for (let hotkey in that.hotkeys) if (hotkey.startsWith("autociv."))
    {
        temp[hotkey] = that.hotkeys[hotkey];
        Engine.ConfigDB_RemoveValue("user", "hotkey." + hotkey);
    }

    Engine.ReloadHotkeys();
    for (let hotkey in temp)
    {
        let keymap = formatHotkeyCombinations(temp[hotkey], false);
        Engine.ConfigDB_CreateValues("user", "hotkey." + hotkey, keymap);
    }
    try {
        if(versionOf0ad != '0.0.26')
            Engine.ConfigDB_SaveChanges("user"); // a27 style
        else
            Engine.ConfigDB_WriteFile("user", "config/user.cfg") // a26 style
    } catch (error) {
        Engine.ConfigDB_WriteFile("user", "config/user.cfg") // a26 style
        warn('this will never happen .')
    }


    Engine.ReloadHotkeys();

    return res;
})
autociv_patchApplyN(GameSettingsControl.prototype, "setNetworkGameAttributesImmediately", function (target, that, args)
{
	const obj = game.attributes
	for (let key in obj)
	{
		if (typeof obj[key] != "object")
			g_GameSettings[key] = obj[key]
		else for (let subkey in obj[key])
			g_GameSettings[key][subkey] = obj[key][subkey]
	}
	return target.apply(that, args)
})
NetMessages.prototype.pollPendingMessages = function ()
{
    while (true)
    {
        let message = Engine.PollNetworkClient();
        if (!message)
            break;

        if(botManager.react(message))
            continue;

        log("Net message: " + uneval(message));

        if (this.netMessageHandlers[message.type])
            for (let handler of this.netMessageHandlers[message.type])
                handler(message);
        else
            error("Unrecognized net message type " + message.type);
    }
}
// STANZA REREGISTER CODE
autociv_patchApplyN(LobbyGameRegistrationController.prototype, "sendImmediately", function (target, that, args)
{
    let result = target.apply(that, args);

    if (g_IsController && that.lastStanza != undefined)
        that.autociv_stanza.setValue("gamesetup", that.lastStanza);

    return result;
})

LobbyGameRegistrationController.prototype.autociv_stanza = new ConfigJSON("stanza", false);
LobbyGameRegistrationController.prototype.autociv_stanza.removeAllValues();
autociv_patchApplyN(MapPreview.prototype, "renderName", function (target, that, args)
{
    let res = target.apply(that, args)

    if (g_autociv_maps.has(g_GameSettings.map))
    {
        that.mapInfoName.size = "5 100%-50 100% 100%-1"
        that.mapInfoName.caption = `${that.mapInfoName.caption} \n[color="225 60 10"]AutoCiv map, only players with mod can play it[/color]`
    }

    return res
})
autociv_patchApplyN(GameSettingControlManager.prototype, "addAutocompleteEntries", function (target, that, args)
{
    let [entries] = args
    entries[200] = entries[200] ?? []
    Array.prototype.push.apply(entries[200], Object.keys(g_NetworkCommands))
    return target.apply(that, args)
})
warnModIsNotEnabled(); // check for feldmap mod is default 23-0624_0327-45
warnSilhouettesIsNotEnabled()

// warn(`5: gui/gamesetup/gamesetup~autociv.js`)

var g_selfIsHost

var p_isJoinedGameGreeted = false

var g_autociv_maps = new Set(["maps/skirmishes/Volcano Island (8)"])

var g_autociv_hotkeys = {
	"autociv.open.autociv_readme": function (ev)
	{
		Engine.PushGuiPage("page_autociv_readme.xml");
},
	"autociv.gamesetup.focus.chatInput": function (ev)
	{
		Engine.GetGUIObjectByName("chatInput").blur();
		Engine.GetGUIObjectByName("chatInput").focus();
	},
	/**
 	 * Can't unfocus chat input without mouse, use cancel hotkey to unfocus from it
 	 * (seems they still get triggered if the hotkey was assigned defined in a xml
 	 * object but won't if they were from Engine.SetGlobalHotkey call)
 	 */
	"cancel": ev =>
	{
		const obj = Engine.GetGUIObjectByName("gameStateNotifications")
		obj?.blur()
		obj?.focus()
	}
};



function handleInputBeforeGui(ev)
{
	g_resizeBarManager.onEvent(ev);
	// warn(`${linnr1()}: handleInputBeforeGui`);
	return false;
}

function setDefaultsToOptionsPersonalizationWhenNewInstalled()
{
	botManager.get("playerReminder").load(true);
	botManager.get("mute").load(true);
	botManager.get("vote").load(false);
	botManager.get("autociv").load(true);
	botManager.get("link").load(true);
	botManager.setMessageInterface("gamesetup");
	autociv_InitSharedCommands()
}

autociv_patchApplyN("init", function (target, that, args)
{
	Engine.GetGUIObjectByName("chatText").buffer_zone = 2.01
	Engine.GetGUIObjectByName("chatText").size = Object.assign(Engine.GetGUIObjectByName("chatText").size, {
		left: 4, top: 4, bottom: -32
	})

	// warn(`62: gui/gamesetup/gamesetup~autociv.js`)

	setDefaultsToOptionsPersonalizationWhenNewInstalled();

	target.apply(that, args);

	// React to hotkeys
	for (let hotkey in g_autociv_hotkeys)
		Engine.SetGlobalHotkey(hotkey, "Press", g_autociv_hotkeys[hotkey]);

	// React to chat and messages
	for (let type of NetMessages.prototype.MessageTypes)
		g_SetupWindow.controls.netMessages.registerNetMessageHandler(type, msg => botManager.react(msg))

	g_autociv_countdown.init();

	Engine.GetGUIObjectByName("chatInput").blur();
	Engine.GetGUIObjectByName("chatInput").focus();



    selfMessage(`83: gui/gamesetup/gamesetup~autociv.js`);

    // selfMessage(`game.is.rated(): ${game.is.rated()} ${linnr2()}`);


	g_selfIsHost = g_IsController // Synonymous variable with g_IsController. for easier to find
	let g_selfIsHost_temp
	// obsolete todo: delete , 23-0814_1558-15 but lets check if its always same first some days/weeks
	if(true)
		setTimeout(() => {
			// Asynchronous operation
			try {
				g_selfIsHost_temp = isSelfHost()
			} catch (error) {
				// Handle the error gracefully or simply ignore it
				warn(`109: ${error} | gui/gamesetup/gamesetup~autociv.js`);
				warn(`110: gui/gamesetup/gamesetup~autociv.js`);
			}
		}, 10);


	// obsolete, seems not obsolete, 23-0822
	if(true)
		setTimeout(() => {
			setCaption_when_JoinOrStart_Setup_suggestRestoreMods_when_modsChanged()
		}, 20);
	else
		setCaption_when_JoinOrStart_Setup_suggestRestoreMods_when_modsChanged()

})


function warnModIsNotEnabled(){
	const key = "autocivP.gamesetup.warnModIsNotEnabled";  // default it will warn
	var warnThisModIsNotEnabled = Engine.ConfigDB_GetValue(
		"user",
		key
	);
	if(!warnThisModIsNotEnabled){
		warnThisModIsNotEnabled = 'feldmap'; // default it will warn
		ConfigDB_CreateAndSaveValueA26A27("user", key, warnThisModIsNotEnabled);
	}
	if(warnThisModIsNotEnabled != 'false'){  // default it will warn
		const modEnabledmods = Engine.ConfigDB_GetValue(
			"user",
			"mod.enabledmods"
		);
		if(!(modEnabledmods.indexOf(warnThisModIsNotEnabled)>0)){
			warn(`Really want play without ${warnThisModIsNotEnabled} mod ?`);
			// warn(`modEnabledmods: ${modEnabledmods} ?`);
		}
	}
}

function warnSilhouettesIsNotEnabled(){
	const key = "silhouettes";  // default it will warn
	var silhouettes = Engine.ConfigDB_GetValue(
		"user",
		key
	);
	if(silhouettes != "true"){
		warn(`Really want play without silhouettes visible? (Settings > Graphics (general) > Unit Silhouettes. Its the fifth option)`);
	}
}





/**
 * Checks if self host and mods have changed and recommends restoring then the last profile.
 */
function setCaption_when_JoinOrStart_Setup_suggestRestoreMods_when_modsChanged(){

	const modsFromUserCfg = Engine.ConfigDB_GetValue("user", "mod.enabledmods");
	const modsFromUserCfg_backup = Engine.ConfigDB_GetValue("user", "autocivP.enabledmods.backup");
	const doHelloAutomaticSuggestionWhenJoinAgameSetup = Engine.ConfigDB_GetValue("user", "autocivP.msg.helloAutomaticSuggestionWhenJoinAgameSetup") === "true"

	let newCaptionString = ''

	let bugIt = false // new implementation so i will watch longer
	// bugIt = true && g_selfNick.includes("seeh") // new implementation so i will watch longer

	if(bugIt && g_selfNick.includes("seeh")){
		selfMessage(`175: g_selfIsHost=${g_selfIsHost}`);
		selfMessage(`175: modsFromUserCfg=${modsFromUserCfg} , modsFromUserCfg_backup=${modsFromUserCfg_backup}`);
	  }


	if(modsFromUserCfg != modsFromUserCfg_backup){
		// const modsFromUserCfg = Engine.ConfigDB_GetValue("user", "mod.enabledmods");
		// const modsFromUserCfg_backup = Engine.ConfigDB_GetValue("user", "autocivP.enabledmods.backup");
		ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.enabledmods.backup`, modsFromUserCfg);

		//   warn('82: have changed enabledmods? do you want restore last profile?');
	  	// g_NetworkCommands["/pRestoreLastProfile"]();
	  	// pRestoreLastProfile();

		if(g_selfIsHost){
			const difference =getDifference(modsFromUserCfg, modsFromUserCfg_backup).trim()

			// bugIt = g_selfNick.includes("seeh") // new implementation so i will watch longer

			if(bugIt){
				// sad we cannot use ${linnr3()} here at the moment.
				selfMessage(`${linnr4()}: \nmodsFromUserCfg = \n${modsFromUserCfg}`)
				selfMessage(`${linnr5()}: \nmodsFromUserCfg_backup = \n${modsFromUserCfg_backup}`)
				selfMessage(difference)
			}
			if(	!(difference == 'feldmap' || difference == 'proGUI') ){
				// ignore some mods. like feldmap. some mods are not makes it need to be ask for restore last profile


				// selfMessage('have changed enabledmods? do you want restore last profile?'); // selfMessage not exist
				const key = 'autocivP.gamesetup.lastCommandProfile'
				const lastCommandProfile = Engine.ConfigDB_GetValue("user", `${key}`);
				selfMessage(`your last used profile was: ${lastCommandProfile}`);
				newCaptionString = (lastCommandProfile) ? '/pRestoreLastProfile' : '/help /p'
				if(bugIt)
					warn(`newCaptionString: ${newCaptionString}`);
			}
		}else{
			// your not host
			// if(doHelloAutomaticSuggestionWhenJoinAgameSetup)
			// newCaptionString = 'hi all (◕‿◕)'



			const countPlayers = Object.keys(g_PlayerAssignments).length;
			// selfMessage(`countPlayers: ${countPlayers}`);
			 // is always 0 first when not waiting
			 // dont forget count yourself
			// let hostName = Engine.LobbyGetNick()
			let hostName = ''
			if(countPlayers == 2){

				let firstPlayerGUID = Object.keys(g_PlayerAssignments)[0];
				hostName = g_PlayerAssignments[firstPlayerGUID].name;
				hostName = splitRatingFromNick(hostName).nick


					// 23-0819_1300-37 now i got the case that i joined a game faster then the host :D becouse i got great internet connecten ==> then fix this like so:
					if(hostName == splitRatingFromNick(g_selfNick))
					{
						firstPlayerGUID = Object.keys(g_PlayerAssignments)[1];
						hostName = g_PlayerAssignments[firstPlayerGUID].name;
						hostName = splitRatingFromNick(hostName).nick
					}
			}
			// i ♡ autocivP♇ mod
			newCaptionString = `hi ${countPlayers > 2 ? 'all ': hostName + ' ' }(◕‿◕). ` //  good luck with setup
			const newBufferPosition = newCaptionString.length

			if(g_selfNick.includes("seeh")){
				newCaptionString += ' i ♡ autocivP♇ mod .'


                const now = new Date();
                const nowMinutes = now.getMinutes();
                const nowEvery30Min = Math.round(nowMinutes / 30) // want message to be sent less often

                playerIsGreeted.push(nowEvery30Min);

            }



			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.caption = newCaptionString
			chatInput.buffer_position = newBufferPosition



			if(bugIt)
				warn(`newCaptionString: ${newCaptionString}`);
		}
	}else{
		// mods have not changed
		const countPlayers = Object.keys(g_PlayerAssignments).length;
		// selfMessage(`countPlayers: ${countPlayers}`);


		if(g_selfIsHost){
			if(doHelloAutomaticSuggestionWhenJoinAgameSetup
				&& countPlayers > 1){ // if you self host and have just started the setup the countPlayers is 1
				newCaptionString = '' // /help /p

				if(g_selfNick.includes("seeh")){
					newCaptionString += ' i ♡ autocivP♇  mod'
                    const now = new Date();
                    const nowMinutes = now.getMinutes();
                    const nowEvery30Min = Math.round(nowMinutes / 30) // want message to be sent less often

                    playerIsGreeted.push(nowEvery30Min);
                }

				selfMessage(`you dont want see this message? \n Game > Settings > Options > Personalization > auto hello Suggestion = false`);
			}

				// newCaptionString = '(◕‿◕) good luck with setup';
				if(bugIt)
					warn(`newCaptionString: ${newCaptionString}`);
		}else{
			// your not host
			if(doHelloAutomaticSuggestionWhenJoinAgameSetup
				&& p_isJoinedGameGreeted == false){
				p_isJoinedGameGreeted = true
				setTimeout(() => {
					const countPlayers = Object.keys(g_PlayerAssignments).length;
					// selfMessage(`countPlayers: ${countPlayers}`);
					 // is always 0 first when not waiting
					 // dont forget count yourself
					// let hostName = Engine.LobbyGetNick()
					let hostName = ''
					if(countPlayers == 2){

						let firstPlayerGUID = Object.keys(g_PlayerAssignments)[0];
						hostName = g_PlayerAssignments[firstPlayerGUID].name;
						hostName = splitRatingFromNick(hostName).nick


							// 23-0819_1300-37 now i got the case that i joined a game faster then the host :D becouse i got great internet connecten ==> then fix this like so:
							if(hostName == g_selfNick)
							{
								firstPlayerGUID = Object.keys(g_PlayerAssignments)[1];
								hostName = g_PlayerAssignments[firstPlayerGUID].name;
								hostName = splitRatingFromNick(hostName).nick
							}
					}
					// i ♡ autocivP♇ mod
					newCaptionString = `hi ${countPlayers > 2 ? 'all ': hostName + '' }(◕‿◕) ` //  good luck with setup
					const newBufferPosition = newCaptionString.length


					if(g_selfNick.includes("seeh")){
						newCaptionString += ' i  ♡ autocivP♇ mod'
						selfMessage(`${linnr1}: g_selfNick: ${g_selfNick}`);

                        const now = new Date();
                        const nowMinutes = now.getMinutes();
                        const nowEvery30Min = Math.round(nowMinutes / 30) // want message to be sent less often

                        playerIsGreeted.push(nowEvery30Min);

					}

					const chatInput = Engine.GetGUIObjectByName("chatInput")
					chatInput.caption = newCaptionString
					chatInput.buffer_position = newBufferPosition
					selfMessage(`you dont want see this message? \n Game > Settings > Options > Personalization > auto hello Suggestion = false`);
				}, 5); // seems 1 millisecond is enough but i take more milliseconds
			}
			if(bugIt)
				warn(`newCaptionString: ${newCaptionString}`);

		}
		// endOf: mods have not changed
	}

	if(bugIt)
		warn(`newCaptionString: ${newCaptionString}`);

	if(newCaptionString){
		const chatInput = Engine.GetGUIObjectByName("chatInput")
		chatInput.caption = newCaptionString
	}
}
var g_linkLong = null; // init should be available during the game and not changed
var g_gameMapMapPrevious = null; // help prefent/debugging a errors, at the moment

// warn('Loaded gamesetup~!extra_commands.js'); // is not defined. but later it will be


var game = {
  // stuff that needs to be updated after the gui updates it (as it removes it before it)
  // undefined will mean it doesnt exist
  attributes: {},
  updateSettings() {
    // g_SetupWindow.controls.gameSettingsController.updateGameAttributes()
    // g_SetupWindow.controls.gameSettingsController.setNetworkGameAttributes()

    // thats a nneddet trick!!! becouse sometimes the other player dont see the updates!
    // but works. btw its possible to set it to  9. dont worry , but needet trick ! 23-0816_1351-04
    /*!SECTION todo: maybe find a more pretty solution then this trick, but seems work pretty well 23-0816_1351-04*/
    const playerCount_backup = g_GameSettings.playerCount.nbPlayers
    if(playerCount_backup < 9){
      const playerCount_newTemp = playerCount_backup + 1
      g_GameSettings.playerCount.nbPlayers = playerCount_newTemp
      g_GameSettings.playerCount.nbPlayers = playerCount_backup
    }
  },
  get controls() {
    return g_SetupWindow.pages.GameSetupPage.gameSettingControlManager
      .gameSettingControls;
  },
  get panels() {

// setGameNameInLobby(text)
    return g_SetupWindow.pages.GameSetupPage.panels;
  },
  get panelsButtons() {
    return g_SetupWindow.pages.GameSetupPage.panelButtons;
  },
  set: {
    resources: (quantity) => {
      if (!g_IsController) return;
      let val = +quantity;
      if (quantity === "" || val === NaN)
        return selfMessage(
          "Invalid starting resources value (must be a number)."
        );

      g_GameSettings.startingResources.resources = val;
      game.updateSettings();
      sendMessage(`Starting resources set to: ${val}`);
    },
    mapcircular: (circular = true) => {
      if (!g_IsController) return;

      g_GameSettings.circularMap.value = circular;
      game.updateSettings();
      sendMessage(`Map shape set to: ${!!circular ? "circular" : "squared"}`);
    },
    population: (quantity) => {
      if (!g_IsController) return;
      let val = parseInt(quantity);
      if (!Number.isInteger(val) || val < 0)
        return selfMessage(
          "Invalid population cap value (must be a number >= 0)."
        );

      g_GameSettings.population.cap = val;
      game.updateSettings();
      sendMessage(`Population cap set to: ${val}`);
    },
    mapsize: (mapsize) => {
      if (!g_IsController) return;
      if (g_GameSettings.mapType != "random")
        return selfMessage(
          `Size can only be set for random maps ( g_GameSettings.mapType = ${g_GameSettings.mapType})`
        );
      let val = parseInt(mapsize);
      if (!Number.isInteger(val) || val < 1)
        return selfMessage("Invalid map size value (must be a number >= 1).");

      g_GameSettings.mapSize.size = val;
      game.updateSettings();
      // sendMessage(`Map size set to: ${val}`);
      sendMessageMapSizeSetTo(val)
    },
    numberOfSlots: (num) => {
      const playerCount = game.controls.PlayerCount;

      selfMessage(`gui/gamesetup/gamesetup~!extra_commands.js 76: player count ${playerCount}`);

      let itemIdx = playerCount.values.indexOf(num);
      playerCount.onSelectionChange(itemIdx);
    },
    player: {


      civ: (playerName, playerCivCode) => {

        let bugIt = false // new implementation so i will watch longer
        // bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer

        if(bugIt)
          selfMessage(`${linnr1()}: playerName = ${playerName}`)

        let playerPos = game.get.player.pos(playerName);
        if (playerPos === undefined || playerPos == -1) return;

        const playerCiv =
          g_SetupWindow.pages.GameSetupPage.gameSettingControlManager
            .playerSettingControlManagers[playerPos - 1].playerSettingControls
            .PlayerCiv;

        // List order can change depending of active language !!
        const dropDownCivCodes = playerCiv.dropdown.list_data;
        let civCodeIndex = dropDownCivCodes.indexOf(playerCivCode);
        if (civCodeIndex == -1) return;

        playerCiv.onSelectionChange(civCodeIndex);
      },
      observer: (playerName) => {
        let playerPos = game.get.player.pos(playerName);
        if (playerPos === undefined || playerPos == -1) return;

        Engine.AssignNetworkPlayer(playerPos, "");
      },
      play: (playerName) => {
        let playerId = game.get.player.id(playerName);
        let numberOfSlots = game.get.numberOfSlots();

        let assignedPos = new Set(); // set of assigned positions

        for (let guid in g_PlayerAssignments) {
          let playerPos = g_PlayerAssignments[guid].player;
          // return if player already assigned
          if (guid === playerId && playerPos > 0 && playerPos <= numberOfSlots)
            return;
          assignedPos.add(playerPos);
        }

        // find first available slot
        for (let pos = 1; pos <= numberOfSlots; ++pos) {
          if (assignedPos.has(pos)) continue;
          else {
            Engine.AssignNetworkPlayer(pos, playerId);
            return;
          }
        }
      },
    },
    /**
     * @param {string} text E.g : "1v1v3" "ffa" "4v4" "2v2v2v2"
     */
    helloAll: (text) => helloAll(text),
    teams: (text) => setTeams(text),
    slotName: (slotNumber, name) => {
      let values = g_GameSettings.playerName.values;
      values[slotNumber - 1] = name;
      g_GameSettings.playerName.values = values;
      game.updateSettings();
    },
  },
  get: {
    player: {
      // Returns undefined if no player with that name (no rating included)
      id: (playerName) => {
        return Object.keys(g_PlayerAssignments).find((id) => {
          let nick1 = splitRatingFromNick(g_PlayerAssignments[id].name).nick;
          let nick2 = splitRatingFromNick(playerName).nick;
          return nick1 == nick2;
        });
      },
      // Returns -1 in case of observer  and undefined if player doesn't exist
      pos: (playerName) => {
        let playerId = game.get.player.id(playerName);
        return g_PlayerAssignments[playerId]?.player;
      },
      selfName: () =>
        splitRatingFromNick(g_PlayerAssignments[Engine.GetPlayerGUID()].name)
          .nick,
      status: function (playerName) {
        switch (g_PlayerAssignments[this.id(playerName)].status) {
          case 1:
            return "ready";
          case 2:
            return "locked";
          default:
            return "blank";
        }
      },
    },
    players: {
      name: () =>
        Object.keys(g_PlayerAssignments).map(
          (id) => splitRatingFromNick(g_PlayerAssignments[id].name).nick
        ),
    },
    numberOfSlots: () => g_GameSettings.playerTeam.values.length,
  },
  is: {
    player: {
      assigned: (playerName) => game.get.player.pos(playerName) >= 0,
    },
    allReady: function () {
      for (let playerName of game.get.players.name())
        if (
          game.is.player.assigned(playerName) &&
          game.get.player.status(playerName) == "blank"
        )
          return false;
      return true;
    },
    full: function () {
      let nOfPlayersAssignedSlot = 0;
      for (let guid in g_PlayerAssignments)
        if (g_PlayerAssignments[guid].player >= 0) nOfPlayersAssignedSlot += 1;

      return g_GameSettings.playerTeam.values.length == nOfPlayersAssignedSlot;
    },
    rated: () => g_GameSettings.rating.enabled,
  },
  reset: {
    civilizations: () => {
      game.panels.resetCivsButton.onPress();
    },
    teams: () => {
      game.panels.resetTeamsButton.onPress();
    },
  },
};




// Alliedview

if (!("g_NetworkCommandsDescriptions" in global))
  global.g_NetworkCommandsDescriptions = {};

g_NetworkCommandsDescriptions = Object.assign(g_NetworkCommandsDescriptions, {
  "/help": "Shows all gamesetup chat commands",
  "/hiAll": "Say hello (configurable). set /hiAll yourWelcomeText or use /hiAll yourWelcomeText",
  "/alliedviewPlease": "Say enable Alliedview please",
  "/playToggle":
    "Toggle want to play action. If enabled observers that type play will be set added to the game",
  "/resources": "Set a specific amount of resources. Can be negative",
  "/resourcesUnlimited": "Set resources to be unlimited",
  "/population": "Set a specific amount of population for each player",
  "/mapsize":
    "Set a specific size for the map. Only for random maps. Small values (<64) might crash the game",
  "/mapcircular": "Force the map to be circular. Only for random maps",
  "/mapsquare": "Force the map to be square. Only for random maps",
  "/resetcivs": "Reset all slots civilizations to random",
  "/autociv": "Toggle autociv (will also disable spec and play actions)",
  "/ready": "Toggle your ready state",
  "/start": "Start the game",
  "/quit": "quit exit the setup of the game",
  "/exit": "quit exit the setup of the game",
  "/countdown":
    "Toggle countdown. Default is 5 seconds. For different time type /countdown time_in_seconds ",
  "/gameName":
    "Change game name that the lobby shows. (Doesn't work currently)",
  "/team":
    "Examples: '/team 3v4', '/team 2v2v2', '/team ffa', 'ffa'. If you don't specify the second number after 'v', it will default to the first number. You can also specify individual player numbers separated by commas (or all that is not a number). For example, '1,2' will assign players 1 and 2 to the same team. ",
  "/randomCivs":
    "Set random civs for all players. Can exclude some civs (needs full name) by typing ex: /randomCivs Mauryas Iberians Romans",
  "/kick": "Kick player",
  "/kickspecs": "Kick all specs",
  "/ban": "Ban player",
  "/banspecs": "Ban all specs",
  "/list": "List all the players and observers currently here",
  "/clear": "Clear the chat comments",
  "/pMainland_1v1_defaults": " for mainland, popMax, 300res, and more",
  "/p1v1Mainland_defaults":
    "/pNumber is alias to some proviles. e.g. /p1... to /pMainland_1v1... or /p4...",
  "/pMainland_2v2_defaults":
    "type pM⟦Tab⟧ for mainland, popMax, 300res, and more",
  "/pMBMainland_2v2_defaults":
    "type pMB⟦Tab⟧ to get mainland balanced popMax, 300res",
  "/pUnknown_defaults":
    "type pU⟦Tab⟧ for  map unknown, popMax, 300res, and more",
  "/pExtinct_volcano_defaults":
    "type pU⟦Tab⟧ for extinct_volcano and other defaults",
  "/pRestoreLastProfile":
    "/pRestoreLastProfile<enter> when you want restore last profile",
  "/iconsList":
    "heart sun flower ...",
  "/modsImCurrentlyUsing":
    "/modsImCurrentlyUsing or try modsImCurrentlyUsing⟦Tab⟧ for a list of all currently used mods",
});

g_NetworkCommands["/versionNr"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  const modsObj = Engine.GetEngineInfo().mods
  var g_autocivPVersion = ''
  for (const [key, value] of Object.entries(modsObj)) {
    if (value.name.toLowerCase() == "autocivP".toLowerCase()) {
      g_autocivPVersion = value.version
      break
    }
  }

  const version0ad = Engine.GetEngineInfo().mods[0].version

  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.focus()
  chatInput.caption = `i use autocivP Version is ${g_autocivPVersion} in 0ad ${version0ad}`
}

g_NetworkCommands["/iconsList"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  selfMessage(transGGWP_markedStrings_I('allicons'))
  const keys = transGGWP_markedStrings_I('alliconkeys')
  selfMessage(keys)
  selfMessage('List of Emojis and Symbols visible in 0ad: https://wildfiregames.com/forum/topic/107659-list-of-emojis-and-symbols-visible-in-0ad/')
  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.focus()
  chatInput.caption = keys
  // let label = Engine.GetGUIObjectByName("option_label[" + i + "]");
  // label.caption = option.label;
  // label.tooltip = option.tooltip;
}

g_NetworkCommands["/iconList"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  selfMessage(transGGWP_markedStrings_I('allicons'))
  const keys = transGGWP_markedStrings_I('alliconkeys')
  selfMessage(keys)
  selfMessage('List of Emojis and Symbols visible in 0ad: https://wildfiregames.com/forum/topic/107659-list-of-emojis-and-symbols-visible-in-0ad/')
  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.focus()
  chatInput.caption = keys
  // let label = Engine.GetGUIObjectByName("option_label[" + i + "]");
  // label.caption = option.label;
  // label.tooltip = option.tooltip;
}

g_NetworkCommands["/listIcons"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  selfMessage(transGGWP_markedStrings_I('allicons'))
  const keys = transGGWP_markedStrings_I('alliconkeys')
  selfMessage(keys)
  selfMessage('List of Emojis and Symbols visible in 0ad: https://wildfiregames.com/forum/topic/107659-list-of-emojis-and-symbols-visible-in-0ad/')
  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.focus()
  chatInput.caption = keys
  // let label = Engine.GetGUIObjectByName("option_label[" + i + "]");
  // label.caption = option.label;
  // label.tooltip = option.tooltip;
}

g_NetworkCommands["/help2All"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  g_NetworkCommands["/help"](match, true);
}

g_NetworkCommands["/help"] = (match, sendIt2AllForRead = false) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  // const sendIt2AllForRead = false; // TODO
  const g_ChatCommandColor = "200 200 255";
  // importand to change the normal \ here! otherwise it wont work .
  const matchStrForReadInGame = match.replace('\\', "∖");
    let text = translate(`Chat commands that match ${matchStrForReadInGame} if its there:`);
  let isSomethingFound = false;
  for (let command in g_NetworkCommands) {
    if(!command)continue; // idk if it helps to get it more stable 23-0624_1401-28
    let noSlashCommand = command.slice(1);

    const filter = new RegExp('' + match + '.*','gi');
    if(match && !command.match(filter)) //  let regexp = /[a-d]/gi;
      continue;

    isSomethingFound = true;
    const asc = g_autociv_SharedCommands[noSlashCommand];
    const ncd = g_NetworkCommandsDescriptions[command];
    text += "\n";
    text += sprintf(translate("%(command)s - %(description)s"), {
      command: "/" + coloredText(noSlashCommand, g_ChatCommandColor),
      description: ncd ?? asc?.description ?? "",
    });
  }

  if(isSomethingFound)
    saveLastCommand2History(`/help ${match}`);
  else
    text += ` nothing found`

  if(sendIt2AllForRead){
    sendMessage("Chat commands if you use this autoCiv Version:");
    sendMessage(text.replace(/\[.*?\]/g,''))
  }else
    selfMessage(text);

  // ConfigDB_CreateAndSaveValueA26A27("user", "autocivP.chat.lastCommand", `/help ${match}`);
};

g_NetworkCommands["/playToggle"] = () => {
  const key = "autociv.gamesetup.play.enabled";
  const enabled = Engine.ConfigDB_GetValue("user", key) == "true";
  // error: Engine.ConfigDB_CreateAndSaveValue is not a function
  ConfigDB_CreateAndSaveValue("user", key, enabled ? "false" : "true");
  selfMessage(
    `Player play autoassign slot ${enabled ? "enabled" : "disabled"}`
  );
};

g_NetworkCommands["/resources"] = (quantity) => game.set.resources(quantity);
g_NetworkCommands["/resourcesUnlimited"] = () => game.set.resources(Infinity);
g_NetworkCommands["/population"] = (population) =>
  game.set.population(population);
g_NetworkCommands["/mapsize"] = (size) => game.set.mapsize(size);
g_NetworkCommands["/mapname"] = () => selfMessage(g_GameSettings.map.map);
g_NetworkCommands["/mapcircular"] = () => game.set.mapcircular(true);
g_NetworkCommands["/mapsquare"] = () => game.set.mapcircular(false);
g_NetworkCommands["/resetcivs"] = () => game.reset.civilizations();
g_NetworkCommands["/autociv"] = () => {
  if (!g_IsController) return;
  let bot = botManager.get("autociv");
  bot.toggle();
  selfMessage(`${bot.name} ${bot.active ? "activated" : "deactivated"}.`);
};
g_NetworkCommands["/ready"] = () => {
  if (g_IsController) return;
  game.panelsButtons.readyButton.onPress();
};

g_NetworkCommands["/start"] = () => {
  if (!g_IsController) return;

  if (!game.is.allReady())
    return selfMessage("Can't start game. Some players not ready.");

  game.panelsButtons.startGameButton.onPress();
};

g_NetworkCommands["/quit"] = () => {
  if (Engine.HasXmppClient())
		Engine.LobbySetPlayerPresence("available")
  Engine.GetGUIObjectByName("cancelButton").onPress()
}
g_NetworkCommands["/exit"] = () => {
  if (Engine.HasXmppClient())
		Engine.LobbySetPlayerPresence("available")
  Engine.GetGUIObjectByName("cancelButton").onPress()
};

g_NetworkCommands["/countdown"] = (input) => {
  if (!g_IsController) return;

  let value = parseInt(input, 10);
  if (isNaN(value)) {
    g_autociv_countdown.toggle();
    return;
  }
  value = Math.max(0, value);
  g_autociv_countdown.toggle(true, value);
};

g_NetworkCommands["/gameName"] = (text) => {
  selfMessage(
    "functoin setGameNameInLobby is off for some reasons at the moment"
  );
  return false;

  setGameNameInLobby(text);
};




g_NetworkCommands["/pRestoreLastProfile"] = () => {
  const key = 'autocivP.gamesetup.lastCommandProfile'
  let lastCommandProfile = Engine.ConfigDB_GetValue("user", `${key}`);
  if(lastCommandProfile == '/pRestoreLastProfile') lastCommandProfile = '';
  selfMessage(`your last used profile was: ${lastCommandProfile}`);
	const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.caption = (lastCommandProfile) ? lastCommandProfile : '/help mainland';
};


g_NetworkCommands["/pMainland_1v1_defaults"] = (text) => {
  pMainland_1v1_defaults();
};
g_NetworkCommands["/1v1Mainland_defaults"] = (text) => {
  pMainland_1v1_defaults();
};
g_NetworkCommands["/p1v1Mainland_defaults"] = (text) => {
  pMainland_1v1_defaults();
};
g_NetworkCommands["/p1"] = (text) => {
  pMainland_1v1_defaults();
};
g_NetworkCommands["/pMainland_2v2_defaults"] = (text) => {
  pMainland_defaults(2);
};
g_NetworkCommands["/p2Mainland_defaults"] = (text) => {
  pMainland_defaults(2);
};
g_NetworkCommands["/2Mainland_defaults"] = (text) => {
  pMainland_defaults(2);
};
g_NetworkCommands["/p3Mainland_defaults"] = (text) => {
  pMainland_defaults(3);
};
g_NetworkCommands["/3Mainland_defaults"] = (text) => {
  pMainland_defaults(3);
};
g_NetworkCommands["/p4Mainland_defaults"] = (text) => {
  pMainland_defaults(4);
};
g_NetworkCommands["/4Mainland_defaults"] = (text) => {
  pMainland_defaults(4);
};
g_NetworkCommands["/pMBMainland_2v2_defaults"] = (text) => {
  pMBMainland_2v2_defaults();
};
g_NetworkCommands["/pExtinct_volcano_defaults"] = (text) => {
  pExtinct_volcano_defaults();
};
g_NetworkCommands["/pVolcano_Extinct_defaults"] = (text) => {
  pExtinct_volcano_defaults();
};
g_NetworkCommands["/pUnknown_defaults"] = (text) => {
  pUnknown();
};
g_NetworkCommands["/pPolarSeaTheWolfesMap"] = (text) => {
  pPolarSeaTheWolfesMap();
};
g_NetworkCommands["/pWolfesInPolarSea"] = (text) => {
  pPolarSeaTheWolfesMap();
};
  /*
Jitsi for Quick Team Calls
Jitsi is a great way to have quick team calls without any setup process. It can also be used as an audio chat for your 0ad-team.

Jitsi is an easy, no-setup way to have quick team calls and audio chats. Perfect for 0ad-teams.

Jitsi: Quick team calls, no setup, audio chat.

*/


// g_NetworkCommands["/jitsiBasic"] = (text) => {
//   if (g_linkLong == null) {
//     let linkidShort = Date.now().toString().substring(10);    // not open this link always. if you have it already probably
//     g_linkLong = `https://meet.jit.si/0ad${linkidShort}audio`;
//     openURL(g_linkLong);
//   }
//   let linkTeam1example = `${g_linkLong}team123`;
//   selfMessage(
//     ` recommendation: send later in your private team-game-chat a other unique link for audio chat. Example:  ${linkTeam1example}`
//   );
//   selfMessage(`${g_linkLong}`);
// };

g_NetworkCommands["/team"] = (text) => game.set.teams(text);
// g_NetworkCommands["/1v1"] = () => game.set.teams("team 1v1");
// g_NetworkCommands["/2v2"] = () => game.set.teams("team 2v2");
// g_NetworkCommands["/3v3"] = () => game.set.teams("team 3v3");
// g_NetworkCommands["/4v4"] = () => game.set.teams("team 4v4");

g_NetworkCommands["/hiAll"] = (text) => game.set.helloAll(text);
g_NetworkCommands["/alliedviewPlease"] = () => sendMessage("enable Alliedview please");


g_NetworkCommands["/randomCivs"] = function (excludedCivs) {
  if (!g_IsController) return;

  const excludeCivList = excludedCivs.trim().toLowerCase().split(/\s+/);
  let civList = new Map(
    Object.values(g_CivData)
      .map((data) => [data.Name.toLowerCase(), data.Code])
      .filter((e) => e[1] != "random")
  );

  excludeCivList.forEach((civ) => civList.delete(civ));

  civList = Array.from(civList);

  const getRandIndex = () => Math.floor(Math.random() * civList.length);

  for (let slot = 1; slot <= game.get.numberOfSlots(); ++slot) {
    const playerCivCode = civList[getRandIndex()][1];
    let civCodeIndex = Object.keys(g_CivData).indexOf(playerCivCode);
    if (civCodeIndex == -1) return;

    g_SetupWindow.pages.GameSetupPage.gameSettingControlManager.playerSettingControlManagers[
      slot - 1
    ].playerSettingControls.PlayerCiv.onSelectionChange(civCodeIndex + 1);
  }
};

function pExtinct_volcano_defaults() {
  // vulcan, vulkan, extinkt <= keywords to find it fast
  setMapTypeFilterNameBiome(
    "maps/random/extinct_volcano",
    "generic/temperate"
  );


  // warning("extinct_volcano"); // thats n

  //   #: gui/gamesetup/Pages/GameSetupPage/GameSettings/Single/Sliders/SeaLevelRiseTime.js:38
  // msgid "Sea Level Rise Time"
  // g_GameSettings.SeaLevelRiseTime = 10; // no error but no effect. extinct_volcano SeaLevelRiseTime
  // g_GameSettings.SeaLevelRiseTime.val = 10; // error but no effect. extinct_volcano SeaLevelRiseTime
  // g_GameSettings.SeaLevelRiseTime.value = 10; // error but no effect. extinct_volcano SeaLevelRiseTime
  // g_GameSettings.seaLevelRiseTime.value = 10; // error undefined but no effect. extinct_volcano SeaLevelRiseTime
  // g_GameSettings.SeaLevelRiseTime.cap = 10; // erro. extinct_volcano SeaLevelRiseTime
  setTeams("team 2v2");
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}

function pMBMainland_2v2_defaults() {
  setMapTypeFilterNameBiome(
    "maps/random/mainland_balanced",
    "generic/temperate"
  );
  setTeams("team 2v2");
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}



function pMainland_1v1_defaults() {
  // game.panelsButtons.startGameButton.onPress(); // works :)) for starting game without anything. maybe good when debugging.
  // game.panelsButtons.backButton.onPress(); // error: backButton is not defined
  // game.panelsButtons.cancelButton.onPress(); // error: is not a function
  // game.panelsButtons.cancelButton().press(true);  // error: is not a function
  // game.panelsButtons.cancelButton().press(true);  // error: is not a function
  // game.cancelButton.onPress(); // undefined
  // game.panelsButtons.exit not exist
  // game.exit(1);
  // return;
  setTeams("team 1v1");
  setMapTypeFilterNameBiome(
    "maps/random/mainland",
    "generic/temperate"
  );
  game.updateSettings(); // maybe needet before call mapsize
  let mapSize = 192; // 128 tiny, 192 small,  256 normal, 320 medium // game.set.mapsize(mapsize); //
  if (false) {
    // true only for testing / debugging
    mapSize = g_GameSettings.mapSize.size;
  } else {
    g_GameSettings.mapSize.size = mapSize;
    game.updateSettings();
  }

  sendMessageMapSizeSetTo(mapSize)


  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}

function pMainland_defaults(playersAtTeamNr) {
  setMapTypeFilterNameBiome(
    "maps/random/mainland",
    "generic/temperate"
  );
  // Map Type
  let mapsize = 256; // 128 tiny, 192 small,  256 normal, 320 medium
  g_GameSettings.mapSize.size = mapsize;
  game.updateSettings();
  // sendMessage(`Map size set to: ${mapsize}`);
  sendMessageMapSizeSetTo(mapsize)
  selfMessage(
    `"Select Map": often used "Mainland" or "Mainland balanced"(needs FeldFeld-Mod) . `
  );
  if (!playersAtTeamNr) setTeams("team 2v2");
  else setTeams(`team ${playersAtTeamNr}v${playersAtTeamNr}`);
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}

function pUnknown() {
  // Map Type
  setMapTypeFilterNameBiome(
    "maps/random/mainland_unknown",
    "generic/temperate"
  );
  setTeams("team 2v2");
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}

function pPolarSeaTheWolfesMap() {
  // Map Type
  setMapTypeFilterNameBiome(
    "maps/random/polar_sea",
    "generic/temperate"
  );
  setTeams("team 2v2");
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}


g_NetworkCommands["/hiall"] = (text) => {
  g_NetworkCommands["/hiAll"](text);
}
g_NetworkCommands["/hiAll"] = (text) => {
  g_NetworkCommands["/hiAll"](text);
}
g_NetworkCommands["/helloAll"] = (text) => {
  g_NetworkCommands["/hiAll"](text);
}
g_NetworkCommands["/helloRated"] = () => {
  g_NetworkCommands["/hiRated"]();

}

g_NetworkCommands["/hiRated"] = () => {
  // sendMessage('Hey :)');
  g_NetworkCommands["/modsImCurrentlyUsing"]();
}

g_NetworkCommands["/ratedDefault"] = (text) => {  // works not in lobby, works in a game config
    const key = "autocivP.gamesetup.ratedDefault";
    const val = (text) ? 'true' : 'false';
    ConfigDB_CreateAndSaveValueA26A27("user", key, val);
    selfMessage(
      `ratedDefault was set to ${val}`
    );
}

g_NetworkCommands["/popMaxDefault"] = (text) => {
    const popMaxDefault = parseInt(text);
    if(popMaxDefault < 20 || popMaxDefault > 300){
      selfMessage('number to small or to large');
      return
    }
    const key = "autocivP.TGmainland.PopMaxDefault";
    const val = popMaxDefault;
    ConfigDB_CreateAndSaveValueA26A27("user", key, val);
    selfMessage(
      `popMaxDefault was set to ${popMaxDefault}`
    );
    selfMessage(
      `when you use will run a profile probably popMaxDefault ${popMaxDefault} will be used.`
    );
}

















g_NetworkCommands["/gl"] = () =>{
  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.caption = transGGWP_markedStrings_I('gl');
}
g_NetworkCommands["/hf"] = () => {
const chatInput = Engine.GetGUIObjectByName("chatInput")
chatInput.caption = transGGWP_markedStrings_I('hf');}
g_NetworkCommands["/wp"] = () => {
const chatInput = Engine.GetGUIObjectByName("chatInput")
chatInput.caption = transGGWP_markedStrings_I('wp');
}
g_NetworkCommands["/u2"] = () => {
const chatInput = Engine.GetGUIObjectByName("chatInput")
chatInput.caption = transGGWP_markedStrings_I('u2');
}
g_NetworkCommands["/gg"] = () => {
const chatInput = Engine.GetGUIObjectByName("chatInput")
chatInput.caption = transGGWP_markedStrings_I('gg');
}



// Store the original functions for backup
const originalNetworkCommands = Object.assign({}, g_NetworkCommands);

// Override the network command functions
for (const command in g_NetworkCommands) {
  const originalFunction = g_NetworkCommands[command];
  g_NetworkCommands[command] = function(text) {
    // selfMessage(`${linnr2()}: Command sent: >${command}< >${text}<`);
    if(command.length > 2 && command.substring(0,2) == '/p' && command != "/pRestoreLastProfile" )
    {
      // selfMessage('profile command found')
      // selfMessage(command);
      ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.gamesetup.lastCommandProfile`, command);
    }

    // later some comands save implicit using saveLastCommand later. example: saveLastCommand(`/help ${match}`); it check if match really match before
    if(command != 'help')
      saveLastCommand2History(text ? `${command} ${text}` : `${command}` ); // this is needet. if you want use it int game setupt process 23-0623_1318-59

    // Call the original function
    originalFunction.call(this, text);
  };
}






/*!SECTION
"Set up teams for the game. Examples: '/team 3v4', '/team 2v2v2', '/team ffa', '/team 4v4'. If you use 'ffa', it will set up a Free-for-All game where everyone is on their own. The command automatically distributes players into teams based on the provided input. The input format is a combination of numbers and 'v' (for versus). For example, '3v4' means 3 players versus 4 players. You can specify up to 4 teams and a maximum of 8 players. If you don't specify the second number after 'v', it will default to the first number, allowing for more concise input. Additionally, you can also specify individual player numbers separated by commas. For example, '1,2' will assign players 1 and 2 to the same team.
*/

function setTeams(text) {
  if (!g_IsController) return;

  if (g_GameSettings.mapType == "scenario")
    return selfMessage("Can't set teams with map type scenario.");

  // selfMessage(`version= ${version}`); // dont work? howto get 0ad version?

  let teams = text.trim().toLowerCase();
  if ("ffa" == teams) {
    g_GameSettings.playerTeam.values = g_GameSettings.playerTeam.values.map(
      (v) => -1
    );
    game.updateSettings();
    return;
  }

  teams = text.match(/(\d+)/g);
  if (teams == null) return selfMessage("Invalid input.");

  if (text.indexOf("v") > 0 && !teams[1]) {
    // little feater. you dont need wirte always the second number. default (if its empty) the fist number
    teams[1] = teams[0]; // if is a 'v' inside and second empty use the first number also. if you want dont have a second team dont write v
    // selfMessage(`teams0= ${teams[0]}`);
    // selfMessage(`teams1= ${teams[1]}`);
  }

  // Transform string to number discarding 0 size teams
  teams = teams.map((v) => +v).filter((v) => v != 0);

  if (teams.length < 1 || teams.length > 4)
    return selfMessage("Invalid number of teams (min 1 max 4).");

  let numOfSlots = teams.reduce((v, a) => (a += v), 0);
  if (numOfSlots < 1 || numOfSlots > 8)
    return selfMessage("Invalid number of players (max 8).");

  g_GameSettings.playerCount.nbPlayers = numOfSlots;
  g_GameSettings.playerTeam.values = teams.flatMap((size, i) =>
    Array(size).fill(i)
  );
  game.updateSettings();
}

/*
HowTo create a JavaScript function in the 0ad mod autoCiv that changes the map filter? When you get
HowTo fix the error 'mapFilter is null' in the following JS-function inside file 'gamesetup~!extra_commands' inside the mod autoCiv?

Whey the following function inside 'gamesetup~!extra_commands' of autoCiv dont work and how to fix it?  function setMapFilterTo2() {     var mapFilter = Engine.GetGUIObjectByName("mapFilter");     mapFilter.selected = 2; }


Whey is it unpossible to develop a mod like autoCiv to set the mapFilter but easily possble to set resources?

The mapFilter is a more complex setting, as it requires more logic and data manipulation than simply setting resources. For example, when setting resources, you just need to assign a certain value to a certain tile. However, when setting the mapFilter, you have to create a logic that determines which tiles should be included in the filter. This requires more complex coding and data manipulation.

How to set the more complex mapFilter and which tiles should be included in the filter while developing a new verson of AutoCiv mod?
*/

// function setMapFilterTo() {
//   let mapFilter = {
//     tiles: ["grass", "dirt", "mountain", "water", "forest"],
//   };
// }

function setGameNameInLobby(text) {
  // selfMessage(
  //   "functoin setGameNameInLobby is off for some reasons at the moment"
  // );
  // return false;
  if (!g_IsController || !Engine.HasNetServer()) return;
  if (!g_SetupWindow.controls.lobbyGameRegistrationController) return;

  let oldGameName =
    g_SetupWindow.controls.lobbyGameRegistrationController.serverName;
  selfMessage(`oldGameName: ${oldGameName}`);

  text = `${text}`;
  g_SetupWindow.controls.lobbyGameRegistrationController.serverName = text;
  selfMessage(`Game name changed to: ${text}`);
  g_SetupWindow.controls.lobbyGameRegistrationController.sendImmediately();
  return true;
}
// setMapTypeFilterNameBiome("random", "default", "maps/random/mainland", "generic/temperate" );
function setMapTypeFilterNameBiome(name, biome, type = "random", filter = "default") {
  g_GameSettings.map.setType(type);
  g_SetupWindow.pages.GameSetupPage.gameSettingControlManager.gameSettingControls.MapFilter.gameSettingsController.guiData.mapFilter.filter =
    filter;
  g_GameSettings.map.selectMap(name);
  g_GameSettings.biome.setBiome(biome);

  game.updateSettings(); // thats needet? that other player see my changes?? for test you nee open 2 player!!! you only could test it if you see both player view

  return selfMessage(`map = ${name}`);
}



function setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration(sendMessageToAll = true){ // forPopmaxAlliedviewRatingTreasuresNomadExploration
  // this function also is(should) always used when a map/profile config is changing 23-0624_1433-08

  let bugIt = false // new implementation so i will watch longer
  // bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer


  g_GameSettings.mapExploration.allied = true; // woks :)  AlliedView
  if(sendMessageToAll)sendMessage('AlliedView = true');

            // autocivP.gamesetup.ratedDefault
  const key = "autocivP.gamesetup.ratedDefault"; // in user.cfg
  const ratedDefault = Engine.ConfigDB_GetValue(
    "user",
    key
  );

  g_GameSettings.rating.enabled = (ratedDefault === 'true') ? true : false ; // no error and test in the lobby. it works
  // game.updateSettings();

    if(bugIt){
      if(ratedDefault == 'true'){
        selfMessage(`${linnr3()}: rated shold enabled gui/gamesetup/gamesetup~!extra_commands.js`);
      }else{
        selfMessage(`${linnr4()}: rated should not enabled gui/gamesetup/gamesetup~!extra_commands.js`);
      }
      selfMessage(`${linnr5()}: =========================================================== gui/gamesetup/gamesetup~!extra_commands.js`);
      selfMessage(`${linnr6()}: ratedDefault: ${ratedDefault} = ${(ratedDefault === 'true')} = enabled={${g_GameSettings.rating.enabled}} gui/gamesetup/gamesetup~!extra_commands.js`);
    }


  if(sendMessageToAll)sendMessage(`rating = ${ratedDefault}`);

  // gui/gamesetup/Pages/GameSetupPage/GameSettings/Single/Checkboxes/Treasures.js
  g_GameSettings.disableTreasures.enabled = true;
  if(sendMessageToAll)sendMessage('disableTreasures = true');
  g_GameSettings.nomad.enabled = false; // works
  if(sendMessageToAll)sendMessage('nomad = false');
  g_GameSettings.mapExploration.enabled = false; // todo: dont work
  if(sendMessageToAll)sendMessage('mapExploration = false');

  let popMaxDefault = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.TGmainland.PopMaxDefault"
  );
  if (!popMaxDefault) {
    popMaxDefault = 200;
  }
  g_GameSettings.population.cap = popMaxDefault; // works its a number option vield
  if(sendMessageToAll)sendMessage('popMaxDefault = ' + popMaxDefault);

  g_GameSettings.startingResources.resources = 300; // works ist a radio selct field
  if(sendMessageToAll)sendMessage('startingResources = ' + g_GameSettings.startingResources.resources);

  // game.updateSettings(); // this neds to disabled ! becouse some rating was not correct set

  // let resources = g_GameSettings.startingResources.resources; // works ist a radio selct field
  let populationMax = g_GameSettings.population.cap; // works its a number option vield
  // selfMessage(`pop= ${populationMax}`);
  // selfMessage(`res= ${resources}`);


  // selfMessage(`your last used profile id was: ${g_lastCommandID} ${linnr7()} `);



  // const lastCommand1 = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${lastCommandID}`);
  // const lastCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${g_lastCommandID}`);
  // selfMessage(`your last used profile was: ${g_lastCommand}`);



  // const key2 = 'autocivP.gamesetup.lastCommand4Profile'
  // ConfigDB_CreateAndSaveValueA26A27("user", key2, g_lastCommandID);

  return populationMax;
}

function sendMessageMapSizeSetTo(mapSize)
{
  // sendMessage(`Map size set to: ${mapsize}`);
  const mapSizes = [
    { size: 128, label: 'tiny' },
    { size: 192, label: 'small' },
    { size: 256, label: 'normal' },
    { size: 320, label: 'medium' }
  ];

  let mapSizeLabel;
  for (const map of mapSizes) {
    if (map.size === mapSize) {
      mapSizeLabel = map.label;
      break;
    }
  }
  sendMessage(`Map size set to: ${mapSizeLabel} (${mapSize})`);
  selfMessage('BTW: Mapsize is 128 tiny, 192 small,  256 normal, 320 is medium')
}
var g_autociv_countdown = {
	"active": false,
	"default_time": parseInt(Engine.ConfigDB_GetValue("user", "autociv.gamesetup.countdown.time"), 10),
	"set_time": undefined,
	"time": undefined,
	"timeoutid": null,
	"running": false,
	"next": function ()
	{
		if (this.time <= 0)
		{
			// Last check before actually pressing
			if (!this.valid())
			{
				this.stopCountdown()
				return
			}

			this.stopCountdown()
			game.panelsButtons.startGameButton.onPress()
			return
		}

		sendMessage(`Game will start in ${this.time} seconds.`)
		this.timeoutid = setTimeout(() =>
		{
			this.time -= 1
			this.next()
		}, 1000)
	},
	"startCountdown": function (time)
	{
		this.stopCountdown()
		this.set_time = time
		this.time = time
		this.running = true
		if (this.valid())
			this.next()
	},
	"resetCountdown": function ()
	{
		this.startCountdown(this.set_time)
	},
	"stopCountdown": function ()
	{
		this.running = false
		clearTimeout(this.timeoutid)
	},
	"isEveryoneReady": () => g_SetupWindow.pages.GameSetupPage.panelButtons.startGameButton.isEveryoneReady(),
	"valid": function ()
	{
		return game.is.full() && game.is.allReady() && this.isEveryoneReady() &&
			(game.get.numberOfSlots() == 2 ? !game.is.rated() : true)
	},
	"gameUpdate": function ()
	{
		if (!this.active)
			return

		if (!this.valid())
			this.stopCountdown()
		else
			this.resetCountdown()
	},
	"gameUpdateSoft": function ()
	{
		if (!this.active)
			return

		if (!this.valid())
			this.stopCountdown()
		else if (!this.running)
			this.resetCountdown()
	},
	"toggle": function (active = !this.active, time = this.default_time)
	{
		this.active = active
		if (active)
		{
			selfMessage(`Countdown set to ${time} seconds.`)
			this.startCountdown(time)
		}
		else
		{
			selfMessage(`Countdown disabled.`)
			this.stopCountdown()
		}
	},
	"init": function ()
	{
		if (g_IsController && Engine.ConfigDB_GetValue("user", "autociv.gamesetup.countdown.enabled") == "true")
			g_autociv_countdown.toggle(true)
	},
}

autociv_patchApplyN("init", function (target, that, args)
{
	target.apply(that, args);
	const ctrl = g_SetupWindow.controls
	ctrl.playerAssignmentsController.registerClientLeaveHandler(() => g_autociv_countdown.gameUpdateSoft())
	ctrl.readyController.registerResetReadyHandler(() => g_autociv_countdown.gameUpdateSoft())
	ctrl.netMessages.registerNetMessageHandler("ready", () => g_autociv_countdown.gameUpdateSoft())
})
LobbyGameRegistrationController.prototype.formatClientsForStanza = function ()
{
	let connectedPlayers = 0;
	let playerData = [];

	for (let guid in g_PlayerAssignments)
	{
		let pData = { "Name": g_PlayerAssignments[guid].name };

		if (g_PlayerAssignments[guid].player != -1)
			++connectedPlayers;
		else
			pData.Team = "observer";

		playerData.push(pData);
	}

	return {
		"list": playerDataToStringifiedTeamList(playerData),
		"connectedPlayers": connectedPlayers
	};
};
autociv_patchApplyN("addChatMessage", function (target, that, args)
{
    let [msg] = args;
    return botManager.react(msg) || target.apply(that, args);
})

class SetHealersInitialStanceAggressive
{
    configKey = "autociv.session.setHealersInitialStanceAggressive"
    callName = "autociv_setHealersInitialStanceAggressive"

    constructor()
    {
        g_NotificationsTypes[this.callName] = this.notificationHandle.bind(this)
        this.updateFromConfig()
        registerConfigChangeHandler(this.onConfigChanges.bind(this))
    }

    onConfigChanges(changes)
    {
        if (changes.has(this.configKey))
            this.updateFromConfig()
    }

    updateFromConfig()
    {
        const active = Engine.ConfigDB_GetValue("user", this.configKey) == "true"
        this.setActive(active)
    }

    setActive(active)
    {
        Engine.GuiInterfaceCall(this.callName, active)
    }

    notificationHandle(msg, player)
    {
        if (player != Engine.GetPlayerID())
            return;

            autociv_stance.set("aggressive", msg.entities)
    }
}

var g_SetHealersInitialStanceAggressive = new SetHealersInitialStanceAggressive()
AutocivControls.PlayersOverlay = class
{
    autociv_playersOverlay = Engine.GetGUIObjectByName("autociv_playersOverlay")
    textFont = "mono-stroke-10"
    configKey_visible = "autociv.session.playersOverlay.visible"
    visible = Engine.ConfigDB_GetValue("user", this.configKey_visible) == "true"
    playerOfflineColor = "250 60 30 250"

    constructor()
    {
        if (this.visible)
            this.update()

        registerPlayerAssignmentsChangeHandler(this.onChange.bind(this))
        registerConfigChangeHandler(this.onConfigChanges.bind(this))
    }

    onConfigChanges(changes)
    {
        if (changes.has(this.configKey_visible))
        {
            this.visible = Engine.ConfigDB_GetValue("user", this.configKey_visible) == "true"
            this.autociv_playersOverlay.hidden = !this.visible
        }
        this.onChange()
    }

    onChange()
    {
        if (this.visible)
            this.update()
    }

    computeSize(textLength)
    {
        return `100%-200 100%-10-100 100% 100%-10`
    }

    update()
    {
        Engine.ProfileStart("AutocivControls.PlayersOverlay:update")

        const playersOffline = g_Players.
            filter(player => player.offline).
            map(player => [player.name, true])

        const observers = Object.keys(g_PlayerAssignments).
            filter(GUID => g_PlayerAssignments[GUID].player == -1).
            map(GUID => [g_PlayerAssignments[GUID].name, false])

        const list = [...playersOffline, ...observers]

        const caption = list.map(([name, isPlayer]) =>
        {
            return isPlayer ? setStringTags(name, { "color": this.playerOfflineColor, }) : name
        }).join(", ")

        this.autociv_playersOverlay.hidden = !caption
        this.autociv_playersOverlay.caption = ""
        this.autociv_playersOverlay.size = this.computeSize(caption.length)
        this.autociv_playersOverlay.caption = setStringTags(caption, {
            "color": "250 250 250 250",
            "font": this.textFont
        })

        Engine.ProfileStop()
    }
}

AutocivControls.StatsOverlay = class
{
    autociv_statsOverlay = Engine.GetGUIObjectByName("autociv_statsOverlay")
    preStatsDefault = {
        "Player      ": state => this.stateName(state), // Player name
        "■ ": state => this.stateStrength(state), // Player color
        "# ": state => `${state.playerNumber}`, // Player number
    }
    preStatsTeam = {
        "T ": state => state.team != -1 ? `${state.team + 1}` : "", // Team number
    }
    stats = {
        "P": state => state.phase,
        " Pop": state => state.popCount,
        " Sup": state => state.classCounts_Support,
        " Inf": state => state.classCounts_Infantry,
        " Cav": state => state.classCounts_Cavalry,
        " Sig": state => state.classCounts_Siege,
        " Chp": state => state.classCounts_Champion,
        "   Food": state => Math.round(state.resourceCounts["food"]),
        "   Wood": state => Math.round(state.resourceCounts["wood"]),
        "  Stone": state => Math.round(state.resourceCounts["stone"]),
        "  Metal": state => Math.round(state.resourceCounts["metal"]),
        " Tec": state => state.researchedTechsCount,
        " Kil": state => state.enemyUnitsKilledTotal ?? 0,
    }

    listTeamRepresentatives = {}
    listUndefeatedPlayerIndices = []
    preStatsSeenBefore = {}
    stateStrengthsCached = {}
    widths = {} // Will be filled on the constructor
    tickPeriod = 10
    textFont = "mono-stroke-10"
    configKey_visible = "autociv.session.statsOverlay.visible"
    configKey_brightnessThreshold = "autociv.session.statsOverlay.brightnessThreshold"
    configKey_symbolizeRating = "autociv.session.statsOverlay.symbolizeRating"

    constructor()
    {
        this.autociv_statsOverlay.hidden = Engine.ConfigDB_GetValue("user", this.configKey_visible) == "false"
        this.autociv_brightnessThreshold = Engine.ConfigDB_GetValue("user", this.configKey_brightnessThreshold)
        this.autociv_symbolizeRating = Engine.ConfigDB_GetValue("user", this.configKey_symbolizeRating) == "true"

        for (let name in { ...this.preStatsDefault, ...this.preStatsTeam, ...this.stats })
            this.widths[name] = name.length

        this.autociv_statsOverlay.onTick = this.onTick.bind(this)
        this.updatePlayerLists()
        registerPlayersFinishedHandler(this.updatePlayerLists.bind(this));
        this.update()
        registerConfigChangeHandler(this.onConfigChanges.bind(this))
    }

    onConfigChanges(changes)
    {
        if (changes.has(this.configKey_visible))
            this.autociv_statsOverlay.hidden = Engine.ConfigDB_GetValue("user", this.configKey_visible) == "false"
        if (changes.has(this.configKey_brightnessThreshold))
            this.autociv_brightnessThreshold = Engine.ConfigDB_GetValue("user", this.configKey_brightnessThreshold)
        if (changes.has(this.configKey_symbolizeRating))
            this.autociv_symbolizeRating = Engine.ConfigDB_GetValue("user", this.configKey_symbolizeRating) == "true"
    }

    stateName(state)
    {
        if (state.state == "defeated")
            return `[icon="icon_defeated_autociv" displace="-2 3"]${state.name}`
        else if (state.state == "won")
            return `[icon="icon_won_autociv" displace="-2 3"]${state.name}`
        return state.name
    }

    stateStrength(state)
    {
        // if the options is turned off or the user is actively playing a local game
        if (!this.autociv_symbolizeRating || (controlsPlayer(g_ViewedPlayer) && !g_IsNetworked))
            return "\u25A0"; // ◼ black square
        if (!this.stateStrengthsCached[state.playerNumber])
        {
            const aiDiff = g_InitAttributes.settings.PlayerData[state.playerNumber].AIDiff
            const userRating = splitRatingFromNick(state.name).rating

            // 5 strength levels shown as unicode characters
            // https://www.unicode.org/charts/PDF/U25A0.pdf
            // Use options.json to teach the player the meaning of the symbol.

            if (userRating > 1800 || aiDiff === 5)
                this.stateStrengthsCached[state.playerNumber] = "\u25B2"; // ♤ black up-pointing triangle
            else if (userRating > 1600 || aiDiff === 4)
                this.stateStrengthsCached[state.playerNumber] = "\u25C6"; // ◆ black diamond
            else if (userRating > 1400 || aiDiff === 3)
                this.stateStrengthsCached[state.playerNumber] = "\u25A0"; // ◼ black square
            else if (userRating > 1200 || aiDiff === 2)
                this.stateStrengthsCached[state.playerNumber] = "\u25AC"; // ▬ black rectangle
            else
                this.stateStrengthsCached[state.playerNumber] = "\u25A1"; // □ white square
        }
        return this.stateStrengthsCached[state.playerNumber]
    }

    toggle()
    {
        this.autociv_statsOverlay.hidden = !this.autociv_statsOverlay.hidden
        Engine.ConfigDB_CreateAndSaveValue(
            "user",
            this.configKey_visible,
            this.autociv_statsOverlay.hidden ? "false" : "true"
        )
    }

    onTick()
    {
        if (this.autociv_statsOverlay.hidden)
            return

        if (g_LastTickTime % this.tickPeriod == 0)
            this.update()
    }

    updatePlayerLists()
    {
        this.listUndefeatedPlayerIndices = []
        this.listTeamRepresentatives = {}
        for (let i = 1; i < g_Players.length; ++i)
        {
            // state can be "won", "defeated" or "active"
            if (g_Players[i].state !== "defeated")
            {
                // GAIA is not part of the autociv state for determining min/max values, thus 1 is subtracted for the index.
                this.listUndefeatedPlayerIndices.push(i - 1)
                const group = g_Players[i].team
                if (group != -1 && !this.listTeamRepresentatives[group])
                    this.listTeamRepresentatives[group] = i;
            }
        }
    }

    maxIndex(list)
    {
        let index = this.listUndefeatedPlayerIndices[0] ?? 0
        let value = list[index]
        for (let i = index + 1; i < list.length; i++)
            if (this.listUndefeatedPlayerIndices.includes(i) && list[i] > value)
            {
                value = list[i]
                index = i
            }
        return index
    }

    minIndex(list)
    {
        let index = this.listUndefeatedPlayerIndices[0] ?? 0
        let value = list[index]
        for (let i = index + 1; i < list.length; i++)
            if (this.listUndefeatedPlayerIndices.includes(i) && list[i] < value)
            {
                value = list[i]
                index = i
            }
        return index
    }

    playerColor(state)
    {
        return brightenedColor(g_DiplomacyColors.getPlayerColor(state.playerNumber), this.autociv_brightnessThreshold)
    }

    teamColor(state)
    {
        return brightenedColor(g_DiplomacyColors.getPlayerColor([this.listTeamRepresentatives[state.team] || state.playerNumber]), this.autociv_brightnessThreshold)
    }

    leftPadTrunc(text, size)
    {
        return text.substring(0, size).padStart(size)
    }

    rightPadTruncPreStats(text, num)
    {
        let key = `${text} ${num}`
        if (!this.preStatsSeenBefore[key])
        {
            const Regexp = /(^\[.*?\])(.*)/
            let str = ""
            // Icons have a width of 18, a single letter has a width of 6
            // Engine.GetTextWidth(this.textFont, "A") = 6
            // Slice three characters more if the text has an icon.
            if (num > 2 && Regexp.test(text))
                str = text.replace(Regexp, "$1") + splitRatingFromNick(text.replace(Regexp, "$2")).nick.slice(0, num - 4).padEnd(num - 3)
            else if (num > 2)
                str = splitRatingFromNick(text).nick.slice(0, num - 1).padEnd(num)
            else
                str = text.padEnd(num)
            this.preStatsSeenBefore[key] = str;
        }
        return this.preStatsSeenBefore[key]
    }

    calcWidth(rowLength)
    {
        return Engine.GetTextWidth(this.textFont, " ") * rowLength + this.autociv_statsOverlay.buffer_zone * 2
    }

    calcHeight(rowQuantity)
    {
        return Engine.GetTextWidth(this.textFont, " ") * 2 * rowQuantity + this.autociv_statsOverlay.buffer_zone
    }

    computeSize(rowQuantity, rowLength)
    {
        return `100%-${this.calcWidth(rowLength)} 100%-228-${this.calcHeight(rowQuantity)} 100% 100%-228`
    }

    update()
    {
        Engine.ProfileStart("AutocivControls.statsOverlay:update")
        const playerStates = Engine.GuiInterfaceCall("autociv_GetStatsOverlay").players?.filter((state, index, playerStates) =>
        {
            if (index == 0 && index != g_ViewedPlayer) // Gaia index 0
                return false

            state.playerNumber = index
            if (g_IsObserver || !g_Players[g_ViewedPlayer] || index == g_ViewedPlayer)
                return true
            if (!playerStates[g_ViewedPlayer].hasSharedLos || !g_Players[g_ViewedPlayer].isMutualAlly[index])
                return false
            return true
        })

        if (!playerStates)
            return

        let header = Object.keys(this.widths).
            map(row => this.leftPadTrunc(row, this.widths[row])).
            join("")
        const rowLength = header.length
        header = setStringTags(header, { "color": "210 210 210" })
        header += "\n"

        const values = {}
        for (let stat of Object.keys(this.stats))
        {
            let list = playerStates.map(this.stats[stat])
            values[stat] = {
                "list": list,
                "min": this.minIndex(list),
                "max": this.maxIndex(list),
            }
        }

        const entries = playerStates.map((state, index) =>
        {
            const preStatsDefault = Object.keys(this.preStatsDefault).
                map(row => this.rightPadTruncPreStats(this.preStatsDefault[row](state), this.widths[row])).
                join("")

            const preStatsTeam = Object.keys(this.preStatsTeam).
                map(row => this.rightPadTruncPreStats(this.preStatsTeam[row](state), this.widths[row])).
                join("")

            const stats = Object.keys(values).map(stat =>
            {
                let text = this.leftPadTrunc(values[stat].list[index].toString(), this.widths[stat])
                switch (index)
                {
                    case values[stat].max: return setStringTags(text, { "color": "230 230 0" })
                    case values[stat].min: return setStringTags(text, { "color": "255 100 100" })
                    default: return text
                }
            }).join("")

            if (state.state == "defeated")
                return setStringTags(preStatsDefault + preStatsTeam + stats, { "color": "255 255 255 128" })

            return setStringTags(preStatsDefault, { "color": this.playerColor(state) }) + setStringTags(preStatsTeam, { "color": this.teamColor(state) }) + stats

        }).join("\n")

        this.autociv_statsOverlay.caption = ""
        this.autociv_statsOverlay.size = this.computeSize(playerStates.length + 1, rowLength)
        this.autociv_statsOverlay.caption = setStringTags(header + entries, {
            "color": "250 250 250 250",
            "font": this.textFont
        })
        Engine.ProfileStop()
    }
}
// Autociv control class with sub classes that will be have an instance at init()

class AutocivControls
{
	constructor()
	{
		this.controls = {}
		for (let className of Object.keys(AutocivControls))
			this.controls[className] = new AutocivControls[className]()
	}
}
var g_AutocivControls; // Created at init


function autociv_initBots()
{
	botManager.get("playerReminder").load(true);
	botManager.get("mute").load(true);
	botManager.get("vote").load(false);
	botManager.get("link").load(true);
	botManager.setMessageInterface("ingame");
	autociv_InitSharedCommands();
}
function autociv_addVersionLabel()
{
	let label = Engine.GetGUIObjectByName("buildTimeLabel");
	if (!label?.caption)
		return;

	let mod = (mod) => /^AutoCiv.*/i.test(mod.name);
	let version = Engine.GetEngineInfo().mods.find(mod)?.version ?? "";
	label.caption = `${label.caption} [color="255 255 255 127"]${version}[/color]`;
}

function autociv_patchSession()
{
	Engine.GetGUIObjectByName("pauseOverlay").size = "0% 0% 100% 30%"
}

function autociv_SetChatTextFromConfig()
{
	const that = autociv_SetChatTextFromConfig
	that.default_size = that.default_size ?? Engine.GetGUIObjectByName("chatPanel").size
	that.default_font = that.default_font ?? Engine.GetGUIObjectByName("chatLines").children[0].font

	const changeSize = Engine.ConfigDB_GetValue("user", "autociv.session.chatPanel.size.change") == "true"
	const size = changeSize ? Engine.ConfigDB_GetValue("user", "autociv.session.chatPanel.size") : that.default_size
	Engine.GetGUIObjectByName("chatPanel").size = size

	const changeFont = Engine.ConfigDB_GetValue("user", "autociv.session.chatText.font.change") == "true"
	const font = changeFont ? Engine.ConfigDB_GetValue("user", "autociv.session.chatText.font") : that.default_font
	for (let child of Engine.GetGUIObjectByName("chatLines").children)
		child.font = font
}

function getGuiObjectsWithHotkey()
{
	let dict = {}
	let internal = 0

	let traverse = parent => parent.children.forEach(child =>
	{
		if (child.name.startsWith("__internal("))
			++internal

		if (child.hotkey)
			dict[child.hotkey] = child

		traverse(child)
	})

	while (true)
	{
		let object = Engine.GetGUIObjectByName(`__internal(${internal})`)
		if (!object)
			break

		// Go to root
		while (object.parent != null)
			object = object.parent

		traverse(object)
		++internal
	}
	return dict
}

var g_hotkeyObjectChange = {
	"camera.follow": ["onPress", "onKeyDown"]
}


function autociv_changeSomeHotkeysToKeyDownAsPressTypeCantBeDiscardedFromBeingCalledForSomeReason()
{
	let guiObjectWithHotkeys = getGuiObjectsWithHotkey()
	for (let hotkey in g_hotkeyObjectChange)
	{
		const obj = guiObjectWithHotkeys[hotkey]
		if (!obj)
			continue

		const [from, to] = g_hotkeyObjectChange[hotkey]
		obj[to] = obj[from].bind(obj[from])
		delete obj[from]
	}

	{
		const that = g_Chat
		Engine.UnsetGlobalHotkey("chat", "Press");
		Engine.UnsetGlobalHotkey("teamchat", "Press");
		Engine.UnsetGlobalHotkey("privatechat", "Press");


		// Engine.SetGlobalHotkey("teamchat", "KeyDown", () => { that.openPage(g_IsObserver ? "/observers" : "/allies"); });

		// fix the autociv and autocivP problem with changing chat context via hotkey. it saves last chat context temporarily and put it in again when you press tab in empty chat 23-0724_1543-57

		Engine.SetGlobalHotkey("chat", "KeyDown", () => {
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			if(chatInput?.caption && chatInput.caption.length > 0){
				selfMessage(`:) getting your chat "${chatInput.caption}" by press ⟦Tab⟧ later`);
				g_chat_draft = chatInput.caption
			}
			// return that.openPage(that.openPage.bind('/allchat')); // /chat dont wort
			return that.openPage.bind(that)
		});

		// Engine.SetGlobalHotkey("chat", "KeyDown", that.openPage.bind(that));
		// Engine.SetGlobalHotkey("chat", "KeyDown",  that.openPage.bind(that) );

		Engine.SetGlobalHotkey("chat", "KeyDown", () => {
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			if(chatInput?.caption && chatInput.caption.length > 0){
				selfMessage(`:) getting your chat "${chatInput.caption}" by press ⟦Tab⟧ later`);

				// if(Engine.ConfigDB_GetValue("user", "autocivP.chat.copyAllChatMessages") !== "true" )
				// 	g_chat_draft = ''

				g_chat_draft += chatInput.caption + "\n"
				// g_chatTextInInputFild_when_msgCommand_lines++
			}
			that.openPage();
		  });

		Engine.SetGlobalHotkey("privatechat", "KeyDown", that.openPage.bind(that));
		Engine.SetGlobalHotkey("teamchat", "KeyDown", () => { that.openPage(g_IsObserver ? "/observers" : "/allies"); });

	}
}

autociv_patchApplyN("init", function (target, that, args)
{
	let result = target.apply(that, args)

	autociv_changeSomeHotkeysToKeyDownAsPressTypeCantBeDiscardedFromBeingCalledForSomeReason()
	autociv_initBots()
	autociv_patchSession()
	autociv_addVersionLabel()
	autociv_SetCorpsesMax(Engine.ConfigDB_GetValue("user", "autociv.session.graphics.corpses.max"))
	autociv_SetChatTextFromConfig()
	g_AutocivControls = new AutocivControls()

	registerConfigChangeHandler(changes =>
	{
		if (changes.has("autociv.session.graphics.corpses.max"))
			autociv_SetCorpsesMax(Engine.ConfigDB_GetValue("user", "autociv.session.graphics.corpses.max"))

		autociv_SetChatTextFromConfig()
	})

	return result
})
function autociv_SetCorpsesMax(value)
{
    Engine.GuiInterfaceCall("autociv_SetCorpsesMax", value);
}
// All possible "autociv.session.entity." possible entries
var g_autociv_hotkey_entity = {
    "by": function (ev, expression)
    {
        if (this.by.rate.rate(expression))
            return

        // "filter1.parameter1.parameter2.by.filter2.parameter1" ... =>
        // [["filter1", "parameter1", "parameter2"], ["filter2", "parameter1", ...], ...]
        const filters = expression.split(".by.").map(v => v.split("."))

        let list = Engine.GuiInterfaceCall("GetPlayerEntities")
        for (let [filter, ...parameters] of filters)
        {
            if (filter in g_autociv_hotkey_entity_by_filter)
                list = g_autociv_hotkey_entity_by_filter[filter](ev, list, parameters)
            else
                warn(`Hotkey "${ev.hotkey}" has invalid filter "${filter}"`)
        }
        g_Selection.reset()
        g_Selection.addList(list)
        return true
    },
    "select": function (ev, templateName)
    {
        autociv_select.entityWithTemplateName(templateName)
        return true
    }
}

// Time rate "by" function, given is expensive
g_autociv_hotkey_entity.by.rate = {
    "interval": 1000 * 1000,
    "last": {
        "time": Engine.GetMicroseconds(),
        "input": ""
    },
    "rate": function (input)
    {
        if (Engine.GetMicroseconds() - this.last.time < this.interval && this.last.input == input)
            return true

        this.last.time = Engine.GetMicroseconds()
        this.last.input = input
    }
}

// All possible "autociv.session.entity.by." possible entries
var g_autociv_hotkey_entity_by_filter = {
    "health": function (ev, list, parameters)
    {
        switch (parameters[0])
        {
            case "wounded":
                return list.filter(unitFilters.isWounded)
            case "nowounded":
                return list.filter(unitFilters.autociv_isNotWounded)
            default:
                error(`Invalid hotkey "${ev.hotkey}" for by.health. parameter "${parameters[0]}"`)
                return list
        }
    },
    "class": function (ev, list, parameters)
    {
        switch (parameters[0])
        {
            case "select":
                return Engine.GuiInterfaceCall("autociv_FindEntitiesWithClassesExpression", {
                    "classesExpression": parameters[1].replace("_", " "),
                    "list": list
                })
            default:
                error(`Invalid hotkey "${ev.hotkey}" for by.class. parameter "${parameters[0]}"`)
                return list
        }
    },
    "rank": function (ev, list, parameters)
    {
        let expression = parameters[0]
        for (let [id, rank] of [[1, "Basic"], [2, "Advanced"], [3, "Elite"]])
            expression = expression.replace(id, rank)

        const evalExpression = autociv_getExpressionEvaluator(expression)
        if (!evalExpression)
        {
            error(`Invalid hotkey "${ev.hotkey}" for by.rank. parameter "${parameters[0]}"`)
            return list
        }

        return list.filter(entity =>
        {
            const entityState = GetEntityState(entity)
            return entityState?.identity && evalExpression([entityState.identity.rank])
        })
    },
    "group": function (ev, list, parameters)
    {
        const expression = parameters[0]
        switch (expression)
        {
            case "none": {
                const entitiesNotGrouped = new Set(list)
                for (let group of g_Groups.groups)
                    for (let entity in group.ents)
                        entitiesNotGrouped.delete(+entity)

                return Array.from(entitiesNotGrouped)
            }
            default:
                error(`Invalid hotkey "${ev.hotkey}" for by.group. parameter "${expression}"`)
                return list
        }
    },
    "state": function (ev, list, parameters)
    {
        const expression = parameters[0].replace("idle", "INDIVIDUAL.IDLE")
        const evalExpression = autociv_getExpressionEvaluator(expression)
        if (!evalExpression)
        {
            error(`Invalid hotkey "${ev.hotkey}" for by.state. parameter "${parameters[0]}"`)
            return list
        }

        return list.filter(entity =>
        {
            const state = GetEntityState(entity)
            return state?.unitAI && evalExpression([state.unitAI.state])
        })
    },
    "screen" : function (ev, list, parameters)
    {
        const expression = parameters[0]
        const entitiesOnScreen = new Set(Engine.PickPlayerEntitiesOnScreen())
        switch(expression){
            case "yes": {
                return list.filter(entity => entitiesOnScreen.has(entity))
            }
            case "no" : {
                return list.filter(entity => !entitiesOnScreen.has(entity))
            }
            default: {
                error(`Invalid hotkey "${ev.hotkey}" for by.group. parameter "${expression}". Only "yes" or "no" are valid.`)
                return list
            }
        }
    }
}


/**
 * COPY&PASTE FROM GUI INTERFACE DUE IMPOSSIBILITY TO PASS FUNCTIONS
 * @param {String} expression
 * @returns {Function} function that evaluates if the input array matches with the expression
 */
function autociv_getExpressionEvaluator(expression)
{
    // /([^&!|()]+)/g  regex matches anything that is not a boolean operator
    const genExpression = list =>
        expression.replace(/([^&!|()]+)/g, match =>
            list.indexOf(match) == -1 ? "0" : "1")

    // Test if expression is a valid expression ([] as dummy data)
    const testExpression = genExpression([])
    // /^[01&!|()]+$/ regex matches only 0 1 and boolean operators
    if (!/^[01&!|()]+$/.test(testExpression))
    {
        // Known pitfall:
        // & and && ( | and || ) are equivalent for 1 bit operations.
        // Use & and | or && and || but do not mix both in the same expression.
        warn(`INVALID EXPRESSION: "${expression}" Only allowed operators are: & ! | ( )`)
        return
    }

    // Test expression is well defined (doesn't throw errors)
    try { !!Function("return " + testExpression)() }
    catch (err)
    {
        warn(`INVALID EXPRESSION: "${expression}" Expression wrongly defined`)
        return
    }

    return list => !!Function("return " + genExpression(list))()
}
class ChatMessageFormatAutocivSelf
{
    parse(msg)
    {
        if (!msg.text)
            return "";

        return { "text": setStringTags(`System == ${msg.text}`, { "font": "sans-bold-stroke-13" }) };
    }
}
ChatInput.prototype.getAutocompleteList = function ()
{
    let list = []
    let playernames = Object.keys(g_PlayerAssignments).map(player => g_PlayerAssignments[player].name);
    Array.prototype.push.apply(list, playernames)
    Array.prototype.push.apply(list, Object.keys(g_NetworkCommands).filter(v => !!v))
    return list
}

ChatInput.prototype.autoComplete = function ()
{
    // selfMessage('11 call autoCompleteText() ---------------')
    // i i use try catch here then i crashes at the first try. so dont use try catch here. 23-0628_0131-59
    try {
        autoCompleteText(this.chatInput, this.getAutocompleteList())
        let guiObject = Engine.GetGUIObjectByName("chatInput")
        guiObject.focus();
    } catch (error) {
        if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
            selfMessage('gui/session/chat/ChatInput~autociv.js:18 autoCompleteText failed')
            warn('gui/session/chat/ChatInput~autociv.js:18 autoCompleteText failed')
            warn(error.message)
            warn(error.stack)
        }
    }
    // selfMessage('13 llllllllllll')
}
/**
 * This class interprets the given message as a chat text sent by a player to a selected addressee.
 * It supports the /me command, translation and acoustic notification.
 */
class ChatMessageFormatPlayer
{
	constructor()
	{
		this.AddresseeTypes = [];
	}

	registerAddresseeTypes(types)
	{
		this.AddresseeTypes = this.AddresseeTypes.concat(types);
	}

	parse(msg)
	{
		if (!msg.text)
			return "";

		let isMe = msg.text.startsWith("/me ");
		if (!isMe && !this.parseMessageAddressee(msg))
			return "";

		isMe = msg.text.startsWith("/me ");
		if (isMe)
			msg.text = msg.text.substr("/me ".length);

		// Translate or escape text
		if (!msg.text)
			return "";

		if (msg.translate)
		{
			msg.text = translate(msg.text);
			if (msg.translateParameters)
			{
				let parameters = msg.parameters || {};
				translateObjectKeys(parameters, msg.translateParameters);
				msg.text = sprintf(msg.text, parameters);
			}
		}
		else
		{
			msg.text = escapeText(msg.text);

			let userName = g_PlayerAssignments[Engine.GetPlayerGUID()].name;
			if (userName != g_PlayerAssignments[msg.guid].name &&
			    msg.text.toLowerCase().indexOf(splitRatingFromNick(userName).nick.toLowerCase()) != -1)
				soundNotification("nick");
		}

		// GUID for players, playerID for AIs
		let coloredUsername = msg.guid != -1 ? colorizePlayernameByGUID(msg.guid) : colorizePlayernameByID(msg.player);

		return {
			"text": sprintf(translate(this.strings[isMe ? "me" : "regular"][msg.context ? "context" : "no-context"]), {
				"message": msg.text,
				"context": msg.context ? translateWithContext("chat message context", msg.context) : "",
				"user": coloredUsername,
				"userTag": sprintf(translate("<%(user)s>"), { "user": coloredUsername })
			})
		};
	}

	/**
	 * Checks if the current user is an addressee of the chatmessage sent by another player.
	 * Sets the context and potentially addresseeGUID of that message.
	 * Returns true if the message should be displayed.
	 *
	 *
	 */
	parseMessageAddressee(msg)
	{

		if (!msg.text.startsWith('/'))
			return true;

		// Split addressee command and message-text
		msg.cmd = msg.text.split(/\s/)[0];
		msg.text = msg.text.substr(msg.cmd.length + 1);

		// GUID is "local" in single-player, some string in multiplayer.
		// Chat messages sent by the simulation (AI) come with the playerID.
		let senderID = msg.player ? msg.player : (g_PlayerAssignments[msg.guid] || msg).player;

		let isSender = msg.guid ?
			msg.guid == Engine.GetPlayerGUID() :
			senderID == Engine.GetPlayerID();

		// Parse private message
		let isPM = msg.cmd == "/msg";
		let addresseeGUID;
		let addresseeIndex;
		if (isPM)
		{
			addresseeGUID = this.matchUsername(msg.text);
			let addressee = g_PlayerAssignments[addresseeGUID];
			if (!addressee)
			{
				if (isSender)
					warn("Couldn't match username: " + msg.text);
				return false;
			}

			// Prohibit PM if addressee and sender are identical
			if (isSender && addresseeGUID == Engine.GetPlayerGUID())
				return false;

			msg.text = msg.text.substr(addressee.name.length + 1);
			addresseeIndex = addressee.player;
		}

		// Set context string
		let addresseeType = this.AddresseeTypes.find(type => type.command == msg.cmd);
		if (!addresseeType)
		{
			if (isSender)
				warn("Unknown chat command: " + msg.cmd);
			return false;
		}
		msg.context = addresseeType.context;

		// For observers only permit public- and observer-chat and PM to observers
		if (isPlayerObserver(senderID) &&
		    (isPM && !isPlayerObserver(addresseeIndex) || !isPM && msg.cmd != "/observers"))
			return false;

		let visible = isSender || addresseeType.isAddressee(senderID, addresseeGUID);
		msg.isVisiblePM = isPM && visible;


		//--------------------------------------------------------------
		// little feature added by me, rest is unchanged:
		// Optimize Your Chat Experience
		// Easily retrieve your last message by pressing tab in an empty chat.
		// Don't miss the opportunity to copy text! Simply select and copy your desired message.
		// Also you have now stored your self written messages. could get it again by pressing tab.
		// warn(`137: msg.text is ${msg.text}`);

		if(Engine.ConfigDB_GetValue("user", "autocivP.chat.copyAllChatMessages") !== "true" )
			g_chatTextInInputFild_when_msgCommand = ''

		g_chatTextInInputFild_when_msgCommand += msg.text + "\n";
		g_chatTextInInputFild_when_msgCommand_lines++
		// variable name is for historical reasons. maybe should be changed a bit.
		//--------------------------------------------------------------

		return visible;
	}

	/**
	 * Returns the guid of the user with the longest name that is a prefix of the given string.
	 */
	matchUsername(text)
	{
		if (!text)
			return "";

		let match = "";
		let playerGUID = "";
		for (let guid in g_PlayerAssignments)
		{
			let pName = g_PlayerAssignments[guid].name;
			if (text.indexOf(pName + " ") == 0 && pName.length > match.length)
			{
				match = pName;
				playerGUID = guid;
			}
		}
		return playerGUID;
	}
}

/**
 * Chatmessage shown after commands like /me or /enemies.
 */
ChatMessageFormatPlayer.prototype.strings = {
	"regular": {
		"context": markForTranslation("(%(context)s) %(userTag)s %(message)s"),
		"no-context": markForTranslation("%(userTag)s %(message)s")
	},
	"me": {
		"context": markForTranslation("(%(context)s) * %(user)s %(message)s"),
		"no-context": markForTranslation("* %(user)s %(message)s")
	}
};
var autociv_select = {
    "entityWithGenericName": function (genericName, selectAll, accumulateSelection)
    {
        const entities = Engine.GuiInterfaceCall("autociv_FindEntitiesWithGenericName", genericName);
        return this.fromList(entities, selectAll, accumulateSelection);
    },
    "entityWithTemplateName": function (templateName, selectAll, accumulateSelection)
    {
        const entities = Engine.GuiInterfaceCall("autociv_FindEntitiesWithTemplateName", templateName);
        return this.fromList(entities, selectAll, accumulateSelection);
    },
    "entityWithClassesExpression": function (classesExpression, selectAll, accumulateSelection)
    {
        // Time rate it, given is an expensive call
        const args = [classesExpression, selectAll, accumulateSelection];
        if (Engine.GetMicroseconds() - this.rate.last.time < this.rate.interval &&
            this.rate.last.args.every((v, i) => v == args[i]))
            return;
        this.rate.last.time = Engine.GetMicroseconds();
        this.rate.last.args = args;

        const entities = Engine.GuiInterfaceCall("autociv_FindEntitiesWithClassesExpression", { "classesExpression": classesExpression });
        return this.fromList(entities, selectAll, accumulateSelection);
    },
    "rate": {
        "interval": 1000 * 1000,
        "last": {
            "time": Engine.GetMicroseconds(),
            "args": []
        }
    },
    /**
     * Select all entities.
     */
    "selectAll": function (entities, accumulateSelection)
    {
        if (!entities?.length)
            return;

        if (!accumulateSelection)
            g_Selection.reset();

        g_Selection.addList(entities);
        return true;
    },
    /**
     * Cycle between entities.
     */
    "cycle": function (entities, accumulateSelection)
    {
        if (!entities?.length)
            return;

        let lastSelectedIndex = entities.findIndex(entity => g_Selection.selected.has(entity));
        if (lastSelectedIndex == -1)
            lastSelectedIndex = 0;

        // Find the first entity after lastSelectedIndex not in the current selection (cyclic)
        for (let index = 0; index < entities.length; ++index)
        {
            const cyclicIndex = (index + lastSelectedIndex) % entities.length;
            const entity = entities[cyclicIndex];
            if (g_Selection.selected.has(entity))
                continue;

            if (!accumulateSelection)
                g_Selection.reset();

            g_Selection.addList([entity]);
            return true;
        }
    },
    "fromList": function (entities,
        selectAll = Engine.HotkeyIsPressed("selection.offscreen"),
        accumulateSelection = Engine.HotkeyIsPressed("selection.add"))
    {
        return selectAll ?
            this.selectAll(entities, accumulateSelection) :
            this.cycle(entities, accumulateSelection);
    }
}
var autociv_stance = {
    "set": function (stance, entities = g_Selection.toList())
    {
        if (!this.stances.has(stance))
            return;

        Engine.PostNetworkCommand({
            "type": "stance",
            "entities": entities,
            "name": stance
        });

        return true;
    },
    "stances": new Set([
        "violent",
        "aggressive",
        "defensive",
        "passive",
        "standground",
    ])
};
function setCameraFollow(entity)
{
	let entState = entity && GetEntityState(entity);
	if (entState && hasClass(entState, "Unit"))
		Engine.CameraFollow(entity);
	else if (!entState || !entState.position)
		Engine.CameraFollow(0);
	else
		Engine.CameraMoveTo(entState.position.x, entState.position.z);
}
autociv_patchApplyN(g_EntityCommands.delete, "execute", function (target, that, args)
{
    if (Engine.ConfigDB_GetValue("user", "autociv.session.kill.nowarning") == "true")
    {
        let [entStates] = args;

        let entityIDs = entStates.reduce(
            (ids, entState) =>
            {
                if (!isUndeletable(entState))
                    ids.push(entState.id);
                return ids;
            },
            []);

        if (!entityIDs.length)
            return;

        Engine.PostNetworkCommand({
            "type": "delete-entities",
            "entities": entityIDs
        });
        return;
    }

    return target.apply(that, args);
})
var autociv_formation = {
    "set": function (formation = "null", entities = g_Selection.toList())
    {
        if (this.formationsList.indexOf(formation) == -1)
            return;

        let formationTemplate = `special/formations/${formation}`;
        if (!canMoveSelectionIntoFormation(formationTemplate))
            return;

        performFormation(entities, formationTemplate)
        return true;
    },
    get formationsList()
    {
        return "_formationsList" in this ? this._formationsList :
            this._formationsList = this.loadFormations();
    },
    "loadFormations": function ()
    {
        let folder = "simulation/templates/special/formations/";
        return Engine.ListDirectoryFiles(folder, "*.xml", false).
            map(text => (text.match(/^.*\/(.+)\.xml$/) || [])[1]).filter(v => !!v);
    }
}
var autociv_minimapExpand = {
	"toggle": function ()
	{
		if (!this.defaultSize)
		{
			this.defaultSize = this.GUI.size;
			this.defaultSizeParent = this.GUIParent.size;
		}

		if (this.expanded)
		{
			this.GUIParent.size = this.defaultSizeParent;
			this.GUI.size = this.defaultSize;
		}
		else
		{
			let windowSize = Engine.GetGUIObjectByName("session").getComputedSize();
			let halfHeight = (windowSize.bottom - windowSize.top) / 2 - 70;

			let sizeParent = `50% 50% 50% 50%`;
			this.GUIParent.size = sizeParent;

			let size = `50%-${halfHeight - 75} 50%-${halfHeight} 50%+${halfHeight - 75} 50%+${halfHeight - 150}`;
			this.GUI.size = size;
		}

		this.expanded = !this.expanded;
	},
	"expanded": false,
	get GUI()
	{
		return "_GUIObject" in this ? this._GUIObject :
			this._GUIObject = Engine.GetGUIObjectByName("minimapPanel");
	},
	get GUIParent() { return this.GUI.parent }
};
updateBuildingPlacementPreview = function (firstTry = true)
{
	// The preview should be recomputed every turn, so that it responds to obstructions/fog/etc moving underneath it, or
	// in the case of the wall previews, in response to new tower foundations getting constructed for it to snap to.
	// See onSimulationUpdate in session.js.

	if (placementSupport.mode === "building")
	{
		if (placementSupport.template && placementSupport.position)
		{
			let result = Engine.GuiInterfaceCall("SetBuildingPlacementPreview", {
				"template": placementSupport.template,
				"x": placementSupport.position.x,
				"z": placementSupport.position.z,
				"angle": placementSupport.angle,
				"actorSeed": placementSupport.actorSeed
			});

			placementSupport.tooltipError = !result.success;
			placementSupport.tooltipMessage = "";

			//########################## CHANGES ######
			if (!result.success && firstTry)
			{
				placementSupport.position = Engine.GetTerrainAtScreenPoint(mouseX, mouseY);
				return updateBuildingPlacementPreview(false);
			}
			//########################## CHANGES ######

			if (!result.success)
			{
				if (result.message && result.parameters)
				{
					let message = result.message;
					if (result.translateMessage)
						if (result.pluralMessage)
							message = translatePlural(result.message, result.pluralMessage, result.pluralCount);
						else
							message = translate(message);
					let parameters = result.parameters;
					if (result.translateParameters)
						translateObjectKeys(parameters, result.translateParameters);
					placementSupport.tooltipMessage = sprintf(message, parameters);
				}
				return false;
			}

			if (placementSupport.attack && placementSupport.attack.Ranged)
			{
				let cmd = {
					"x": placementSupport.position.x,
					"z": placementSupport.position.z,
					"range": placementSupport.attack.Ranged.maxRange,
					"elevationBonus": placementSupport.attack.Ranged.elevationBonus
				};
				let averageRange = Math.round(Engine.GuiInterfaceCall("GetAverageRangeForBuildings", cmd) - cmd.range);
				let range = Math.round(cmd.range);
				placementSupport.tooltipMessage = sprintf(translatePlural("Basic range: %(range)s meter", "Basic range: %(range)s meters", range), { "range": range }) + "\n" +
					sprintf(translatePlural("Average bonus range: %(range)s meter", "Average bonus range: %(range)s meters", averageRange), { "range": averageRange });
			}
			return true;
		}
	}
	else if (placementSupport.mode === "wall" &&
		placementSupport.wallSet && placementSupport.position)
	{
		placementSupport.wallSnapEntities = Engine.PickSimilarPlayerEntities(
			placementSupport.wallSet.templates.tower,
			placementSupport.wallSnapEntitiesIncludeOffscreen,
			true, // require exact template match
			true  // include foundations
		);

		return Engine.GuiInterfaceCall("SetWallPlacementPreview", {
			"wallSet": placementSupport.wallSet,
			"start": placementSupport.position,
			"end": placementSupport.wallEndPosition,
			"snapEntities": placementSupport.wallSnapEntities // snapping entities (towers) for starting a wall segment
		});
	}

	return false;
}

// Snaps building placement to cursor and previews it
function autociv_showBuildingPlacementTerrainSnap(mousePosX, mousePosY)
{
	placementSupport.position = Engine.GetTerrainAtScreenPoint(mousePosX, mousePosY);

	if (placementSupport.mode === "wall")
	{
		// Including only the on-screen towers in the next snap candidate list is sufficient here, since the user is
		// still selecting a starting point (which must necessarily be on-screen). (The update of the snap entities
		// itself happens in the call to updateBuildingPlacementPreview below.)
		placementSupport.wallSnapEntitiesIncludeOffscreen = false;
	}
	else
	{
		if (placementSupport.template && Engine.GuiInterfaceCall("GetNeededResources", { "cost": GetTemplateData(placementSupport.template).cost }))
		{
			placementSupport.Reset();
			inputState = INPUT_NORMAL;
			return true;
		}

		if (isSnapToEdgesEnabled())
		{
			// We need to reset the angle before the snapping to edges,
			// because we want to get the angle near to the default one.
			placementSupport.SetDefaultAngle();
		}
		let snapData = Engine.GuiInterfaceCall("GetFoundationSnapData", {
			"template": placementSupport.template,
			"x": placementSupport.position.x,
			"z": placementSupport.position.z,
			"angle": placementSupport.angle,
			"snapToEdges": isSnapToEdgesEnabled() && Engine.GetEdgesOfStaticObstructionsOnScreenNearTo(
				placementSupport.position.x, placementSupport.position.z)
		});
		if (snapData)
		{
			placementSupport.angle = snapData.angle;
			placementSupport.position.x = snapData.x;
			placementSupport.position.z = snapData.z;
		}
	}

	updateBuildingPlacementPreview(); // includes an update of the snap entity candidates
	return false; // continue processing mouse motion
}


/**
 * Select a building from the construction panel given the current unit(s) selected.
 * @param return - true if buildings exist and is selected to place.
 */
function autociv_placeBuildingByTemplateName(templateName)
{
	// Hack: fast check
	if (Engine.GetGUIObjectByName("unitConstructionPanel").hidden)
		return;

	const cycleTemplates = Engine.ConfigDB_GetValue("user", "autociv.session.building.place." + templateName).match(/[^\W]+/g)
	const templates = [templateName]
	if (cycleTemplates)
		templates.push(...cycleTemplates)

	const self = autociv_placeBuildingByTemplateName
	if (self.state.templateName != templateName || !placementSupport.mode)
		self.state.index = -1

	for (let _ = 0; _ < templates.length; _++)
	{
		self.state.index = (self.state.index + 1) % templates.length
		let templateToSelect = templates[self.state.index]

		let index = g_SelectionPanels.Construction.getItems().
			findIndex(templatePath => templatePath.endsWith(templateToSelect));

		if (index == -1)
			continue;

		const unitConstructionButton = self.buttons[index]

		if (!unitConstructionButton ||
			unitConstructionButton.hidden ||
			!unitConstructionButton.enabled ||
			!unitConstructionButton.onPress)
			continue;

		unitConstructionButton.onPress();

		autociv_showBuildingPlacementTerrainSnap(mouseX, mouseY);

		animate(unitConstructionButton).complete().add({
			"onStart": it => it.sprite = "snIconPortraitOver",
			"onComplete": it => it.sprite = "snIconPortrait",
			"duration": 100
		})
		self.state.templateName = templateName

		return true;
	}
}

autociv_placeBuildingByTemplateName.state = {
	"templateName": "",
	"index": -1
}

autociv_placeBuildingByTemplateName.buttons = new Proxy({}, {
	get(target, key)
	{
		return key in target ?
			target[key] :
			target[key] = Engine.GetGUIObjectByName(`unitConstructionButton[${key}]`);
	}
})

function autociv_clearSelectedProductionQueues()
{
	// Hack: fast check
	if (Engine.GetGUIObjectByName("unitQueuePanel").hidden)
		return;

	g_Selection.toList().map(GetEntityState).forEach(entity =>
	{
		if (!entity.production)
			return;

		for (let item of entity.production.queue)
			Engine.PostNetworkCommand({
				"type": "stop-production",
				"entity": entity.id,
				"id": item.id
			});
	});
	return true;
}

var g_autociv_hotkeys_beforeGui = {
	"selection.cancel": function (ev)
	{
		if (autociv_minimapExpand.expanded)
		{
			autociv_minimapExpand.toggle()
			return true
		}
	}
}

var g_autociv_hotkeys = {
	"autociv.session.exit": function (ev)
	{
		for (let name in QuitConfirmationMenu.prototype)
		{
			let quitConfirmation = new QuitConfirmationMenu.prototype[name]();
			if (quitConfirmation.enabled())
				quitConfirmation.display();
		}
		return true;
	},
	"autociv.open.autociv_readme": function (ev)
	{
		Engine.PushGuiPage("page_autociv_readme.xml");
	},
	"autociv.session.production.queue.clear": function (ev)
	{
		autociv_clearSelectedProductionQueues();
		return true;
	},
	"autociv.session.minimap.expand.toggle": function (ev)
	{
		autociv_minimapExpand.toggle();
		return true;
	},
	"selection.woundedonly": function (ev)
	{
		let list = g_Selection.toList();
		g_Selection.reset();
		g_Selection.addList(list.filter(unitFilters.isWounded));
	},
	"autociv.selection.nowoundedonly": function (ev)
	{
		let list = g_Selection.toList();
		g_Selection.reset();
		g_Selection.addList(list.filter(unitFilters.autociv_isNotWounded));
	}
}

var g_autociv_hotkeysPrefixes = {
	"autociv.session.building.place.": function (ev, hotkeyPrefix)
	{
		const buildingTemplateName = ev.hotkey.split(hotkeyPrefix)[1]
		autociv_placeBuildingByTemplateName(buildingTemplateName);
		return true;
	},
	"autociv.session.formation.set.": function (ev, hotkeyPrefix)
	{
		let formationName = ev.hotkey.split(hotkeyPrefix)[1];
		autociv_formation.set(formationName);
		return false;
	},
	"autociv.session.stance.set.": function (ev, hotkeyPrefix)
	{
		let stanceName = ev.hotkey.split(hotkeyPrefix)[1];
		autociv_stance.set(stanceName);
		return false;
	},
	"autociv.session.entity.": function (ev, hotkeyPrefix)
	{
		let expression = ev.hotkey.slice(hotkeyPrefix.length);

		for (let prefix in g_autociv_hotkey_entity)
		{
			const prefixDot = prefix + ".";
			if (expression.startsWith(prefixDot))
				return g_autociv_hotkey_entity[prefix](ev, expression.slice(prefixDot.length));
		}
		return false;
	}
};

autociv_patchApplyN("handleInputBeforeGui", function (target, that, args)
{
	let [ev] = args;
	if ("hotkey" in ev && ev.type == "hotkeydown")
	{
		// Hotkey with normal behaviour
		if (ev.hotkey in g_autociv_hotkeys_beforeGui)
			return !!g_autociv_hotkeys_beforeGui[ev.hotkey](ev);
	}
	return target.apply(that, args);
})

autociv_patchApplyN("handleInputAfterGui", function (target, that, args)
{
	let [ev] = args;
	if ("hotkey" in ev && ev.type == "hotkeydown")
	{
		// Special case hotkeys
		for (let prefix in g_autociv_hotkeysPrefixes)
			if (ev.hotkey.startsWith(prefix))
				return !!g_autociv_hotkeysPrefixes[prefix](ev, prefix);

		// Hotkey with normal behaviour
		if (ev.hotkey in g_autociv_hotkeys)
			return !!g_autociv_hotkeys[ev.hotkey](ev);
	}
	return target.apply(that, args);
})

unitFilters.autociv_isNotWounded = entity =>
{
	let entState = GetEntityState(entity);
	return entState &&
		hasClass(entState, "Unit") &&
		entState.maxHitpoints &&
		100 * entState.hitpoints > entState.maxHitpoints * Engine.ConfigDB_GetValue("user", "gui.session.woundedunithotkeythreshold");
};

autociv_patchApplyN("getPreferredEntities", function (target, that, args)
{
	let [ents] = args;
	if (Engine.HotkeyIsPressed("autociv.selection.nowoundedonly"))
		return ents.filter(unitFilters.autociv_isNotWounded);

	return target.apply(that, args);
})

autociv_patchApplyN("performGroup", function (target, that, args)
{
	let [action, groupId] = args;

	// Garrison selected units inside the building from the control group groupId
	if (action == "breakUp" && Engine.HotkeyIsPressed("autociv.group.button.garrison"))
	{
		let selection = g_Selection.toList();
		if (!selection.length)
			return;

		let ents = Object.keys(g_Groups.groups[groupId].ents);
		if (ents.length != 1)
			return;

		let target = +ents[0];
		let targetState = GetEntityState(target);
		if (!targetState || !targetState.garrisonHolder)
			return;

		Engine.PostNetworkCommand({
			"type": "garrison",
			"entities": selection,
			"target": target,
			"queued": false
		});

		Engine.GuiInterfaceCall("PlaySound", {
			"name": "order_garrison",
			"entity": selection[0]
		});

		return;
	}
	return target.apply(that, args);
})
var g_autociv_stanza = new ConfigJSON("stanza", false);

autociv_patchApplyN(LobbyGamelistReporter.prototype, "sendGamelistUpdate", function (target, that, args)
{
    g_autociv_stanza.setValue("session", {
        "connectedPlayers": that.countConnectedPlayers(),
        "minPlayerData": playerDataToStringifiedTeamList([...that.getPlayers(), ...that.getObservers()])
    });
    return target.apply(that, args);
})

let g_proGUIPVersion = null;

/**
 * Whether we are attempting to join or host a game.
 * this file will proofed when you join a game
 */
var g_IsConnecting = false;

/**
 * "server" or "client"
 */
let g_GameType;

/**
 * Server title shown in the lobby gamelist.
 */
let g_ServerName = "";

/**
 * Identifier if server is using password.
 */
let g_ServerHasPassword = false;

let g_ServerId;

let g_IsRejoining = false;
let g_PlayerAssignments; // used when rejoining
let g_UserRating;
// added by custom rating
let g_PlayerName;


function init(attribs) {
    let g_UserRatingString;
    /*
    https://wildfiregames.com/forum/topic/55450-howto-read-~snap0ad236localshare0adreplays00252021-08-05_0002metadatajson/?do=findComment&comment=452775
    how to read howTo read metadata.json from a mod ? (  ~/snap/0ad/236/.local/share/0ad/replays/0.0.25/2021-08-05_0002/metadata.json )
    That file is used in the replaymenu in the public mod. It is loaded via Engine.GetReplayMetadata called from replay_menu.js
     */
    if (!attribs || !attribs.rating) {
        g_UserRatingString = Engine.ConfigDB_GetValue("user", "UserRatingBackup"); // get backup
        g_UserRating = g_UserRatingString > 10 ? g_UserRatingString : '';
    } else {
        g_UserRating = (attribs.rating);
        g_UserRatingString = "" + g_UserRating + "";
        Engine.ConfigDB_CreateValue("user", "UserRatingBackup", g_UserRatingString); // 1 just as dummy
        Engine.ConfigDB_WriteValueToFile("user", "UserRatingBackup", g_UserRatingString, "config/user.cfg"); // backup rating if rating-server is working
    }

    // added by custom rating - START
    let customrating_value = Engine.ConfigDB_GetValue("user", "autocivP.customUsernameDropdown");
    const customrating_trueFalse = Engine.ConfigDB_GetValue("user", "customrating");


    const modsObj = Engine.GetEngineInfo().mods
    for (const [key, value] of Object.entries(modsObj)) {
        if (value.name === "proGUI") {
            g_proGUIPVersion = value.version
        break
        }
    }

    if (customrating_trueFalse == "false" && !g_proGUIPVersion ) { // if g_proGUIP is used then always us customrating
        // Get only username without brackets
        g_UserRating = false;
        // if(g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
        //     warn('67: set: g_UserRating = false')
        // }
    } else if (true) { //  || isNaN(customrating_value)

        // if(g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
        //     warn('72: set: g_UserRating = false')
        // }

        //replace extra chars (hav to do this coz options save button will save them in wrong charset)
        // customrating_value = customrating_value.replace(/\^1/g,"∞");
        // https://unicode-table.com/de/2665/

        const isCustomratingEnabled = ( customrating_trueFalse != "false" )
        if(isCustomratingEnabled){
            customrating_value = customrating_value.replace(/\^n/g, "nuub");
            customrating_value = customrating_value.replace(/\^vn/g, "very nub");
            customrating_value = customrating_value.replace(/\^0/g, "youtuber");
            customrating_value = customrating_value.replace(/\^1/g, "unfocused today");
            customrating_value = customrating_value.replace(/\^2/g, " rated");
            customrating_value = customrating_value.replace(/\^3/g, " unrated");
            // customrating_value = customrating_value.replace(/\^3/g,"™");
            customrating_value = customrating_value.replace(/\^4/g, " programmer\?");
            // customrating_value = customrating_value.replace(/\^5/g,"↑");
            customrating_value = customrating_value.replace(/\^5/g, " spec");
            customrating_value = customrating_value.replace(/\^6/g, " spec\=i not play");
            customrating_value = customrating_value.replace(/\^7/g, " ill today");
            customrating_value = customrating_value.replace(/\^8/g, " overrated");
            customrating_value = customrating_value.replace(/\^9/g, " underrated");
            // customrating_value = customrating_value.replace('Host','');
            customrating_value = customrating_value.replace(/^[^\d\w\-]*[0-9]+[^\d\w\-]*$/g, ''); // if its only a number. cut it out
        }

        // warn(`112: customrating_value: ${customrating_value}`);
        // if(g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
        //     warn(`g_proGUIPVersion: ${g_proGUIPVersion}`)
        // }

        const delimiterSymbol = "|"; // |
        if(g_proGUIPVersion){
            const temp = "proGUI";
            customrating_value = ( isCustomratingEnabled && customrating_value && customrating_value !== 'false')
            ? `${temp}${delimiterSymbol}${customrating_value}`
            : temp ;
        }



        if (typeof g_LocalRatingsDatabase !== 'undefined') { // DODO sad its not available from autocivP ... means i need rebuild/copy some functions. should i do this ? 23-0722_1551-58 . i hope maybe Mentula will do it maybe in a day in future
            const playerName = 'seeh'
            const playerData = g_LocalRatingsDatabase[playerName];
            customrating_value += ` LR ${playerData.rating}`;
        }


        if ( customrating_value === 'false') {
            //no rating in username
            // g_UserRating = attribs.rating + " // if its empty . enabled but empty => works 2021-0902_1324-54
            // g_UserRating = attribs.rating + " // if its empty . enabled but empty => works bot long for this field. end ) is not there 2021-0902_1326-08
            g_UserRating = attribs.rating //  // if its empty . enabled but empty => works bot long for this field. end ) is not there 2021-0902_1327-19
        } else {
            //g_UserRating = customrating_value.substring(0,10)
            // g_UserRating = customrating_value.substring(0,16);
            // warn(`112: customrating_value: ${customrating_value}`);
            const maxLength = 24; // if you set here to long then later the ')' will cut off. 25 was a mistake. 25 seems the maximum length possible 23-0728_1307-06,  33 when you observer 23-0728_2214-44
            // max. 25 letter, then its cut off. 33 when you observer 23-0728_2214-50
            // local hosted game: max. 33 letter, then its cut off . Example(pink yourself): seeh (1205|proGUI|unfocused toda
            customrating_value = customrating_value.trim()
            let length_ratingPlusCustomRating = g_UserRating.length + customrating_value.length + 1;
            if(length_ratingPlusCustomRating > maxLength){
                customrating_value = customrating_value.substring(0,maxLength - g_UserRating.length - 2) + "..";
            }

            // const lastLetter = customrating_value.charAt(customrating_value.length - 1);
            // if(lastLetter != ')'){
            //     customrating_value += ')';
            // }
            const bugIt = false
            if(bugIt && g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
                warn(`141: set: g_UserRating = ${g_UserRating} , \n customrating_value: ${customrating_value}`);
                warn(`142: length: ${customrating_value.length} , \n customrating_value: ${customrating_value}`);
            }


            g_UserRating =  (customrating_value )
            ? g_UserRating + ((g_UserRating) ? '|': '') + customrating_value + ''
            : g_UserRating;
            // g_UserRating = customrating_value + ""; // customrating_value not empty with som texts


            if(bugIt && g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
                warn(`149: set: g_UserRating = ${g_UserRating} , \n customrating_value: ${customrating_value}`);
                warn(`151: length: ${customrating_value.length} , \n customrating_value: ${customrating_value}`);
            }

        }
    } else {
        warn('159: whish you good game. as observer your name is 33 letters max long');
        //warn(uneval("customrating numbers not allowed - adding spaces"));
        // g_UserRating = " " + customrating_value.substring(0,16) + " ";
        g_UserRating = " " + customrating_value + " "; // <= need a space at the end . for prevent errors
        // here we observers
        // // max. 25 letter, then its cut off. 33 when you observer 23-0728_2214-50
    }
    //g_ServerPort = attribs.port;
    if(false)
    g_PlayerName = !!attribs.name
        ? attribs.name + (g_UserRating ? " (" + g_UserRating + ")"
        : "")
        : "";
    //warn(uneval("attribs.name:" + attribs.name));
    //warn(uneval("g_UserRating:" + g_UserRating));
    // added by custom rating - END
    switch (attribs.multiplayerGameType) {
        case "join": {
            if (!Engine.HasXmppClient()) {
                switchSetupPage("pageJoin");
                break;
            }
            if (attribs.hasPassword) {
                g_ServerName = attribs.name;
                g_ServerId = attribs.hostJID;
                switchSetupPage("pagePassword");
            } else if (startJoinFromLobby(attribs.name, attribs.hostJID, ""))
                switchSetupPage("pageConnecting");
            break;
        }
        case "host": {
            let hasXmppClient = Engine.HasXmppClient();
            Engine.GetGUIObjectByName("hostSTUNWrapper").hidden = !hasXmppClient;
            Engine.GetGUIObjectByName("hostPasswordWrapper").hidden = !hasXmppClient;
            if (hasXmppClient) {
                Engine.GetGUIObjectByName("hostPlayerName").caption = attribs.name;
                Engine.GetGUIObjectByName("hostServerName").caption =
                    sprintf(translate("%(name)s's game"), {"name": attribs.name});

                Engine.GetGUIObjectByName("useSTUN").checked = Engine.ConfigDB_GetValue("user", "lobby.stun.enabled") == "true";
            }

            switchSetupPage("pageHost");
            break;
        }
        default:
            error("Unrecognised multiplayer game type: " + attribs.multiplayerGameType);
            break;
    }
}

function cancelSetup() {
    if (g_IsConnecting)
        Engine.DisconnectNetworkGame();

    if (Engine.HasXmppClient())
        Engine.LobbySetPlayerPresence("available");

    // Keep the page open if an attempt to join/host by ip failed
    if (!g_IsConnecting || (Engine.HasXmppClient() && g_GameType == "client")) {
        Engine.PopGuiPage();
        return;
    }

    g_IsConnecting = false;
    Engine.GetGUIObjectByName("hostFeedback").caption = "";

    if (g_GameType == "client")
        switchSetupPage("pageJoin");
    else if (g_GameType == "server")
        switchSetupPage("pageHost");
    else
        error("cancelSetup: Unrecognised multiplayer game type: " + g_GameType);
}

function confirmPassword() {
    if (Engine.GetGUIObjectByName("pagePassword").hidden)
        return;
    if (startJoinFromLobby(g_ServerName, g_ServerId, Engine.GetGUIObjectByName("clientPassword").caption))
        switchSetupPage("pageConnecting");
}

function confirmSetup() {
    if (!Engine.GetGUIObjectByName("pageJoin").hidden) {
        let joinPlayerName = Engine.GetGUIObjectByName("joinPlayerName").caption;
        let joinServer = Engine.GetGUIObjectByName("joinServer").caption;
        let joinPort = Engine.GetGUIObjectByName("joinPort").caption;

        if (startJoin(joinPlayerName, joinServer, getValidPort(joinPort)))
            switchSetupPage("pageConnecting");
    } else if (!Engine.GetGUIObjectByName("pageHost").hidden) {
        let hostServerName = Engine.GetGUIObjectByName("hostServerName").caption;
        if (!hostServerName) {
            Engine.GetGUIObjectByName("hostFeedback").caption = translate("Please enter a valid server name.");
            return;
        }

        let hostPort = Engine.GetGUIObjectByName("hostPort").caption;
        if (getValidPort(hostPort) != +hostPort) {
            Engine.GetGUIObjectByName("hostFeedback").caption = sprintf(
                translate("Server port number must be between %(min)s and %(max)s."), {
                    "min": g_ValidPorts.min,
                    "max": g_ValidPorts.max
                });
            return;
        }

        let hostPlayerName = Engine.GetGUIObjectByName("hostPlayerName").caption;
        let hostPassword = Engine.GetGUIObjectByName("hostPassword").caption;
        if (startHost(hostPlayerName, hostServerName, getValidPort(hostPort), hostPassword))
            switchSetupPage("pageConnecting");
    }
}

function startConnectionStatus(type) {
    g_GameType = type;
    g_IsConnecting = true;
    g_IsRejoining = false;
    Engine.GetGUIObjectByName("connectionStatus").caption = translate("Connecting to server...");
}

function onTick() {
    if (!g_IsConnecting)
        return;

    pollAndHandleNetworkClient();
}

function getConnectionFailReason(reason) {
    switch (reason) {
        case "not_server":
            return translate("Server is not running.");
        case "invalid_password":
            return translate("Password is invalid.");
        case "banned":
            return translate("You have been banned.");
        case "local_ip_failed":
            return translate("Failed to get local IP of the server (it was assumed to be on the same network).");
        default:
            warn("Unknown connection failure reason: " + reason);
            return sprintf(translate("\\[Invalid value %(reason)s]"), {"reason": reason});
    }
}

function reportConnectionFail(reason) {
    messageBox(
        400, 200,
        (translate("Failed to connect to the server.")
        ) + "\n\n" + getConnectionFailReason(reason),
        translate("Connection failed")
    );
}

function pollAndHandleNetworkClient() {
    while (true) {
        var message = Engine.PollNetworkClient();
        if (!message)
            break;

        log(sprintf(translate("Net message: %(message)s"), {"message": uneval(message)}));
        // If we're rejoining an active game, we don't want to actually display
        // the game setup screen, so perform similar processing to gamesetup.js
        // in this screen
        if (g_IsRejoining) {
            switch (message.type) {
                case "serverdata":
                    switch (message.status) {
                        case "failed":
                            cancelSetup();
                            reportConnectionFail(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "netstatus":
                    switch (message.status) {
                        case "disconnected":
                            cancelSetup();
                            reportDisconnect(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "players":
                    g_PlayerAssignments = message.newAssignments;
                    break;

                case "start":
                    Engine.SwitchGuiPage("page_loading.xml", {
                        "attribs": message.initAttributes,
                        "isRejoining": g_IsRejoining,
                        "playerAssignments": g_PlayerAssignments
                    });

                    // Process further pending netmessages in the session page
                    return;

                case "chat":
                    break;

                case "netwarn":
                    break;

                default:
                    error("Unrecognised net message type: " + message.type);
            }
        } else
            // Not rejoining - just trying to connect to server.
        {
            switch (message.type) {
                case "serverdata":
                    switch (message.status) {
                        case "failed":
                            cancelSetup();
                            reportConnectionFail(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "netstatus":
                    switch (message.status) {
                        case "connected":
                            Engine.GetGUIObjectByName("connectionStatus").caption = translate("Registering with server...");
                            break;

                        case "authenticated":
                            if (message.rejoining) {
                                Engine.GetGUIObjectByName("connectionStatus").caption = translate("Game has already started, rejoining...");
                                g_IsRejoining = true;
                                return; // we'll process the game setup messages in the next tick
                            }
                            Engine.SwitchGuiPage("page_gamesetup.xml", {
                                "serverName": g_ServerName,
                                "hasPassword": g_ServerHasPassword
                            });
                            return; // don't process any more messages - leave them for the game GUI loop

                        case "disconnected":
                            cancelSetup();
                            reportDisconnect(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "netwarn":
                    break;

                default:
                    error("Unrecognised net message type: " + message.type);
                    break;
            }
        }
    }
}

function switchSetupPage(newPage) {
    let multiplayerPages = Engine.GetGUIObjectByName("multiplayerPages");
    for (let page of multiplayerPages.children)
        if (page.name.startsWith("page"))
            page.hidden = true;

    if (newPage == "pageJoin" || newPage == "pageHost") {
        let pageSize = multiplayerPages.size;
        let halfHeight = newPage == "pageJoin" ? 145 : Engine.HasXmppClient() ? 140 : 125;
        pageSize.top = -halfHeight;
        pageSize.bottom = halfHeight;
        multiplayerPages.size = pageSize;
    } else if (newPage == "pagePassword") {
        let pageSize = multiplayerPages.size;
        let halfHeight = 60;
        pageSize.top = -halfHeight;
        pageSize.bottom = halfHeight;
        multiplayerPages.size = pageSize;
    }

    Engine.GetGUIObjectByName(newPage).hidden = false;

    Engine.GetGUIObjectByName("hostPlayerNameWrapper").hidden = Engine.HasXmppClient();
    Engine.GetGUIObjectByName("hostServerNameWrapper").hidden = !Engine.HasXmppClient();

    Engine.GetGUIObjectByName("continueButton").hidden = newPage == "pageConnecting" || newPage == "pagePassword";
}

function startHost(playername, servername, port, password) {
    startConnectionStatus("server");

    Engine.ConfigDB_CreateAndWriteValueToFile("user", "playername.multiplayer", playername, "config/user.cfg");

    Engine.ConfigDB_CreateAndWriteValueToFile("user", "multiplayerhosting.port", port, "config/user.cfg");

    let hostFeedback = Engine.GetGUIObjectByName("hostFeedback");

    // Disallow identically named games in the multiplayer lobby
    if (Engine.HasXmppClient() &&
        Engine.GetGameList().some(game => game.name == servername)) {
        cancelSetup();
        hostFeedback.caption = translate("Game name already in use.");
        return false;
    }

    let useSTUN = Engine.HasXmppClient() && Engine.GetGUIObjectByName("useSTUN").checked;

    try {
        Engine.StartNetworkHost(playername + (g_UserRating ? " (" + g_UserRating + ")" : ""), port, useSTUN, password);
    } catch (e) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf(translate("Cannot host game: %(message)s."), {"message": e.message}),
            translate("Error")
        );
        return false;
    }

    g_ServerName = servername;
    g_ServerHasPassword = !!password;

    if (Engine.HasXmppClient())
        Engine.LobbySetPlayerPresence("playing");

    return true;
}

/**
 * Connect via direct IP (used by the 'simple' MP screen)
 */
function startJoin(playername, ip, port) {
    try {
        Engine.StartNetworkJoin(playername, ip, port);
    } catch (e) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf(translate("Cannot join game: %(message)s."), {"message": e.message}),
            translate("Error")
        );
        return false;
    }

    startConnectionStatus("client");

    // Future-proofing: there could be an XMPP client even if we join a game directly.
    if (Engine.HasXmppClient())
        Engine.LobbySetPlayerPresence("playing");

    // Only save the player name and host address if they're valid.
    Engine.ConfigDB_CreateAndWriteValueToFile("user", "playername.multiplayer", playername, "config/user.cfg");
    Engine.ConfigDB_CreateAndWriteValueToFile("user", "multiplayerserver", ip, "config/user.cfg");
    Engine.ConfigDB_CreateAndWriteValueToFile("user", "multiplayerjoining.port", port, "config/user.cfg");
    return true;
}

/**
 * Connect via the lobby.
 */
function startJoinFromLobby(playername, hostJID, password) {
    if (!Engine.HasXmppClient()) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf("You cannot join a lobby game without logging in to the lobby."),
            translate("Error")
        );
        return false;
    }

    try {
        Engine.StartNetworkJoinLobby(playername + (g_UserRating ? " (" + g_UserRating + ")" : ""), hostJID, password);
    } catch (e) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf(translate("Cannot join game: %(message)s."), {"message": e.message}),
            translate("Error")
        );
        return false;
    }

    startConnectionStatus("client");

    Engine.LobbySetPlayerPresence("playing");

    return true;
}

function getDefaultGameName() {
    return sprintf(translate("%(playername)s's game"), {
        "playername": multiplayerName()
    });
}

function getDefaultPassword() {
    return "";
}
autociv_patchApplyN("init", (target, that, args) => {
    const res = target.apply(that, args);
    const [attribs] = args


    if(false && g_selfNick =="seeh"){ // programmer need to see bit more info
      warn("7: attribs:", attribs)
      warn("7: typeof attribs:", typeof attribs) // typeof attribs give no result
      warn("7: attribs.rating:", attribs.rating) // give no result
      warn("7: attribs.rating:", attribs.rating) // give no result
      warn("7: (attribs.rating):", (attribs.rating)) // give no result
      warn("7: { attribs }:", { attribs }) // give no result
      warn("7: Object.keys(attribs):", Object.keys(attribs) ) // give no result
      for (let i = 0; i < attribs.length; i++) {
          warn(i); // Output: 0, 1, 2
      }         // give no result
      // it never gives me any results? when it gives results? 23-0730_2229-20
  }


    if (attribs.hasPassword)
    {
        let input = Engine.GetGUIObjectByName("clientPassword");
        input.blur()
        input.focus()
        input.buffer_position = input.caption.length;
        input.onPress = () => confirmPassword()
    }
    else if (attribs.multiplayerGameType == "host")
    {
        let input = Engine.GetGUIObjectByName("hostServerName");
        input.blur()
        input.focus()
        if(false && Engine.Config_selfNick =="seeh")
            input.caption = '♡mods: proGUI(bot?) autocivP(audio,setups) localRatings GodsEye(setups) ... ♡ YouTube LiveStreaming';

        else{
            const modEnabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);

      const customrating_trueFalse = Engine.ConfigDB_GetValue("user", "customrating");
      const isCustomratingEnabled = ( customrating_trueFalse === "true" )

      let text = ''
      const gameStartSuggestionKey = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey"
        );
      const gameStartSuggestionKey1 = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey1"
        );
      const gameStartSuggestionKey2 = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey2"
        );
      const gameStartSuggestionKey3 = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey3"
        );
      let gameStartSuggestion_value = ''
      // The variations 'nub' and 'nuub' are alternative spellings of 'noob' and are commonly used in online communities or forums.
      if(isCustomratingEnabled && gameStartSuggestionKey.trim().length > 0){
        let value = ''
        value = (gameStartSuggestionKey == '^1') ? "learn/teach/talk game" : value
        value = (gameStartSuggestionKey == '^2') ? "TotalGames>10" : value

        gameStartSuggestion_value += `|${value}`
      }
      if(isCustomratingEnabled && gameStartSuggestionKey2 !== 'false' && gameStartSuggestionKey2.trim().length > 0){
        let value = ''
        value = (gameStartSuggestionKey2 == '^1') ? "1v1" : value
        value = (gameStartSuggestionKey2 == '^2') ? "2v2" : value
        value = (gameStartSuggestionKey2 == '^3') ? "3v3, 4v4" : value
        gameStartSuggestion_value += `|${value}|`
      }else{
        // autocivP.gamesetup.ratedDefault = "false"

        //                                                                    autocivP.gamesetup.useRatedDefaultInGameName
        const useRatedDefaultInGameName = ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.useRatedDefaultInGameName") === "true" )

        if(useRatedDefaultInGameName){
          const isRatedDefault = ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.ratedDefault") === "true" )
          gameStartSuggestion_value += (isRatedDefault) ? '|rated|' :  '|unrated|' // is not expicited set in the options so suggest what rated default is
        }

      }
      if(isCustomratingEnabled && gameStartSuggestionKey3.trim().length > 0){
        let value = ''
        value = (gameStartSuggestionKey3 == '^1') ? "pingMe" : value
        gameStartSuggestion_value += `${value}|`
      }

            const lenFirst = input.caption.length
            const gameStartTime = nextGameStartTime()

            const modsInGameName
              = Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.gameStart.showModsInGameName") == "true"
              ? `| ${modEnabledmods.slice(11,)} ← Mods I'm currently using`
              : ''

            if(gameStartTime)
              text = `${gameStartSuggestion_value} ${nextGameStartTime()} ${modsInGameName}`
            else
              text = `${gameStartSuggestion_value} ${modsInGameName}`
            // input.caption = nextGameStartTime()


            if ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.noUsernameInGameName") == "true" ){
              // if(g_selfNick =="seeh") //NOTE - developers
              //   warn(`109: ${text} = text`)
              text = text.replace(/^[\| ]*(.*?)[\| ]*$/, "$1"); // trim from leading of ending | delimiters
              input.caption = text // for some reason this was not inserted in a local game name setup. not sure why and not big problem. dont want to fix it 23-0724_1309-330
              // if(g_selfNick =="seeh") //NOTE - developers
              //   warn(`112: ${text} = text`)
            }else{
              text = text.replace(/[\| ]*$/, ""); // trim from ending | delimiters
              input.caption += text
              input.buffer_position = lenFirst
            }
            // input.caption += nextGameStartTime()
            // input.caption = nextGameStartTime()

    }

        // input.buffer_position = input.caption.length;
        input.onPress = () => confirmSetup()
    }
    return res
})

function nextGameStartTime() {


  let inNextFullMinute = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.gamesetup.gameStart.inNextFullMinute"
    );

  let showCountrysCode = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.gamesetup.gameStart.inNextFullMinuteCountrys"
    );


    // autocivP.gamesetup.gameStart.inNextFullMinuteRemove00
    const remove00 = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.gamesetup.gameStart.inNextFullMinuteRemove00"
    );


  if(inNextFullMinute.length < 1 || isNaN(inNextFullMinute))
    return false

    const getNextHalfHour = (inNextFullMinute) => {
      const now = new Date();
      const nowMinutes = now.getMinutes();



      if(!inNextFullMinute && isNaN(inNextFullMinute))
        inNextFullMinute = 30
      else inNextFullMinute = parseInt(inNextFullMinute)

      const roundedMinutes = Math.ceil(minutes / inNextFullMinute) * inNextFullMinute;
      const nextHalfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinutes, 0);
      if (roundedMinutes === 60) {
        nextHalfHour.setHours(now.getHours() + 1);
        nextHalfHour.setMinutes(0);
      }
      return nextHalfHour;
    };

    const formatTime = (date, timeZone) => {
      const options = {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone,
      };
      return date.toLocaleTimeString('en-US', options);
    };

    const nextHalfHour = getNextHalfHour();

    // const gameStartTimeGMT = formatTime(nextHalfHour, 'GMT'); // same like 'Europe/London'

        // const message = `${gameStartTimeEU.split(':').slice(0, 2).join(':')} EU/Berlin, ${gameStartTimeIndian.split(':').slice(0, 2).join(':')} IST, ${gameStartTimeET.split(':').slice(0, 2).join(':')} ET, ${gameStartTimePT.split(':').slice(0, 2).join(':')} PT`; // GMT is same like europa london

        // nut totally sure if this source is really correct. i tried to geht help here:
        // https://stackoverflow.com/questions/76767940/es6-formattime-for-asia-kolkata-and-funplanat-moon-gives-always-the-same-result

        const Latvia = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/London');

    const tBerlinLondonSwedenDenmark = formatTime(nextHalfHour, 'Europe/London');

    // const tSweden = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Stockholm');
    const tGreece = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Athens');

    const Asia_Kolkata = formatTime(new Date(nextHalfHour.getTime() + (3.5 * 60 * 60 * 1000)), 'Asia/Kolkata');
    const USA_ET = formatTime(new Date(nextHalfHour.getTime() - (6 * 60 * 60 * 1000)), 'America/New_York');
    const USA_Los_Angeles = formatTime(new Date(nextHalfHour.getTime() - (9 * 60 * 60 * 1000)), 'America/Los_Angeles');
    const USA_Chicago = formatTime(new Date(nextHalfHour.getTime() - (7 * 60 * 60 * 1000)), 'America/Los_Angeles');

    const Mexiko = formatTime(new Date(nextHalfHour.getTime() - (8 * 60 * 60 * 1000)), 'Europe/London');

    const RioGrandeDoSulBrasilien = formatTime(new Date(nextHalfHour.getTime() - (5 * 60 * 60 * 1000)), 'Europe/London');

    if(true){

        // check its correct to london
        // const sweden = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Stockholm');
        // const greece = formatTime(new Date(nextHalfHour.getTime() + (2 * 60 * 60 * 1000)), 'Europe/Athens');

        // const Asia_Kolkata = formatTime(new Date(nextHalfHour.getTime() + (4.5 * 60 * 60 * 1000)), 'Asia/Kolkata');
        // const USA_ET = formatTime(new Date(nextHalfHour.getTime() - (5 * 60 * 60 * 1000)), 'America/New_York');
        // const USA_PT = formatTime(new Date(nextHalfHour.getTime() - (8 * 60 * 60 * 1000)), 'America/Los_Angeles');

    }

    // compare here: https://www.timeanddate.com/time/zone/usa
    let message =''

    if(!showCountrysCode || showCountrysCode === 'all')
      showCountrysCode = 'LatviaLondonAthensKolkataChicagoNewYorkLosAngelesMexikoRioGrandeDoSul';
    if(showCountrysCode.indexOf('London') > -1)
      message += ` ${tBerlinLondonSwedenDenmark.split(':').slice(0, 2).join(':')} Berlin`;
    if(showCountrysCode.indexOf('Latvia') > -1)
      message += ` ${Latvia.split(':').slice(0, 2).join(':')} Latvia`;
    if(showCountrysCode.indexOf('Athens')>-1)
      message += ` ${tGreece.split(':').slice(0, 2).join(':')} Greece`;
    if(showCountrysCode.indexOf('Kolkata')>-1)
      message += ` ${Asia_Kolkata.split(':').slice(0, 2).join(':')} KolkataAsia`;
    if(showCountrysCode.indexOf('Chicago')>-1)
      message += ` ${USA_Chicago.split(':').slice(0, 2).join(':')} Chicago`;
    if(showCountrysCode.indexOf('NewYork')>-1)
      message += ` ${USA_ET.split(':').slice(0, 2).join(':')} NewYork`;
    if(showCountrysCode.indexOf('LosAngeles')>-1)
      message += ` ${USA_Los_Angeles.split(':').slice(0, 2).join(':')} LosAngeles`;
    if(showCountrysCode.indexOf('Mexiko')>-1)
      message += ` ${Mexiko.split(':').slice(0, 2).join(':')} Mexiko`;
    if(showCountrysCode.indexOf('RioGrandeDoSul')>-1)
      message += ` ${RioGrandeDoSulBrasilien.split(':').slice(0, 2).join(':')} RioGrandeBrasil`;


    if(remove00) // autocivP.gamesetup.gameStart.inNextFullMinuteRemove00
      return message.replace(/\:00/g,'');

    // warn(message)
    return message;
    // 3:30 PM EU/Berlin time, 8:00 PM IST for Indian players, 9:30 AM ET, 6:30 AM PT, 2:30 PM GMT
  }

function init()
{
    Engine.GetGUIObjectByName("buttonWebpage").caption = Engine.Translate("Mod webpage")
    Engine.GetGUIObjectByName("buttonClose").caption = Engine.Translate("Close")
    Engine.GetGUIObjectByName("title").caption = Engine.Translate("Autociv readme")

    const webpageURL = "https://wildfiregames.com/forum/topic/107371-autocivp-add-ons-profiles-jitsi-team-call"
    Engine.GetGUIObjectByName("buttonWebpage").onPress = () => Engine.OpenURL(webpageURL)

    const markdown = Engine.ReadFile("moddata/autociv_README.md")
    Engine.GetGUIObjectByName("text").caption = autociv_SimpleMarkup(markdown)
}
var autociv_focus = {
	"gameList": function ()
	{
		let GUIobject = Engine.GetGUIObjectByName("gamesBox");
		GUIobject.blur();
		GUIobject.focus();
	},
	"chatInput" ()
	{
		let GUIobject = Engine.GetGUIObjectByName("chatInput");
		GUIobject.blur();
		GUIobject.focus();

		const modsFromUserCfg_const = Engine.ConfigDB_GetValue(
			"user",
			"mod.enabledmods"
		  );
		const autoFixModsOrder = Engine.ConfigDB_GetValue(
			"user",
			"modProfile.showAutoFixModsOrder"
		  );

		const posboonGUI = modsFromUserCfg_const.indexOf('boonGUI')
		const posproGUI = modsFromUserCfg_const.indexOf('proGUI')

		if(autoFixModsOrder === "true" && !posproGUI){
			warn(`posproGUI not found`)

			//TODO - fix this msgbox was not showed
			messageBox(
				400, 200,
				translate("modProfile showAutoFixModsOrder need a resart"),
				translate("Confirmation"),
				[translate("No"), translate("Yes")],
				[null, restart0ad()]);
		}
		if(autoFixModsOrder === "true" && posboonGUI && posproGUI < posboonGUI ){
			warn(`posproGUI < posboonGUI`)

			let clean = '';
			clean = modsFromUserCfg_const.replaceAll(/\s+\bproGUI\b/g, ' '); // remove proGUI
			clean = clean.replaceAll(/\s*\bboonGUI\b\s*/g, ' proGUI '); // include proGUI instead boonGUI
			// clean = clean.replaceAll(/\bboonGUI\b /g, 'proGUI boonGUI ');
			ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods',clean)

			//TODO - fix this msgbox was not showed
			messageBox(
				400, 200,
				translate("modProfile showAutoFixModsOrder need a resart"),
				translate("Confirmation"),
				[translate("No"), translate("Yes")],
				[null, restart0ad()]);

			// messageBox(500, 200, translate("modProfile showAutoFixModsOrder need a resart"), translate("Error"))

		}


	}
}

var g_autociv_hotkeys = {
	"autociv.lobby.focus.chatInput": autociv_focus.chatInput,
	"autociv.lobby.focus.gameList": autociv_focus.gameList,
	"autociv.lobby.gameList.selected.join": () => g_LobbyHandler.lobbyPage.lobbyPage.buttons.joinButton.onPress(),
	"autociv.open.autociv_readme": ev => Engine.PushGuiPage("page_autociv_readme.xml"),
	"autociv.lobby.host": ev => g_LobbyHandler.lobbyPage.lobbyPage.buttons.hostButton.onPress(),
	"summary": ev => autociv_showLastGameSummary(),
	/**
	 * Can't unfocus chat input without mouse, use cancel hotkey to unfocus from it
	 * (seems they still get triggered if the hotkey was assigned defined in a xml
	 * object but won't if they were from Engine.SetGlobalHotkey call)
	 */
	"cancel": ev =>
	{
		const obj = Engine.GetGUIObjectByName("gameStateNotifications")
		obj?.blur()
		obj?.focus()
	}
};


function autociv_showLastGameSummary ()
{
	const replays = Engine.GetReplays(false)
	if (!replays.length)
	{
		messageBox(500, 200, translate("No replays data available."), translate("Error"))
		return
	}

	const lastReplay = replays.reduce((a, b) => a.attribs.timestamp > b.attribs.timestamp ? a : b)
	if (!lastReplay)
	{
		messageBox(500, 200, translate("No last replay data available."), translate("Error"))
		return
	}

	const simData = Engine.GetReplayMetadata(lastReplay.directory)
	if (!simData)
	{
		messageBox(500, 200, translate("No summary data available."), translate("Error"))
		return
	}

	Engine.PushGuiPage("page_summary.xml", {
		"sim": simData,
		"gui": {
			"replayDirectory": lastReplay.directory,
			"isInLobby": true,
			"ingame": false,
			"dialog": true
		}
	})
}
function handleInputBeforeGui (ev)
{
	g_resizeBarManager.onEvent(ev);
	return false;
}

function setDefaultsToOptionsPersonalizationWhenNewInstalled ()
{
	botManager.get("playerReminder").load(true);
	botManager.get("mute").load(true);
	botManager.get("vote").load(false);
	botManager.get("link").load(true);
	botManager.setMessageInterface("lobby");
	autociv_InitSharedCommands();
}



autociv_patchApplyN("init", function (target, that, args)
{
	// setTimeout doesn't have tick update in lobby -> make one
	Engine.GetGUIObjectByName("middlePanel").onTick = () =>
	{
		g_Time = Date.now();
		updateTimers()
	}

	setDefaultsToOptionsPersonalizationWhenNewInstalled();

	// SEND PATCH TO PHAB
	Engine.GetGUIObjectByName("chatText").buffer_zone = 2.01
	Engine.GetGUIObjectByName("chatText").size = Object.assign(Engine.GetGUIObjectByName("chatText").size, {
		left: 4, top: 4, bottom: -32
	})

	target.apply(that, args);

	// React to hotkeys
	for (let hotkey in g_autociv_hotkeys)
		Engine.SetGlobalHotkey(hotkey, "Press", g_autociv_hotkeys[ hotkey ]);

	// React to GUI objects resize bars
	{
		g_resizeBarManager.add("chatPanel", "top", undefined, [ [ "gamesBox", "bottom" ] ])
		g_resizeBarManager.add("middlePanel", "left", undefined, [ [ "leftPanel", "right" ] ]);
		g_resizeBarManager.add("middlePanel", "right", undefined, [ [ "rightPanel", "left" ] ]);

		let gameInfo = Engine.GetGUIObjectByName("sgMapName")?.parent;
		if (gameInfo)
		{
			let gameInfoUsers = gameInfo.children[ gameInfo.children.length - 1 ];
			let gameInfoDescription = gameInfo.children[ gameInfo.children.length - 2 ];
			g_resizeBarManager.add(gameInfoUsers, "top", undefined, [ [ gameInfoDescription, "bottom" ] ], () => !gameInfo.hidden);
		}
	}

	// Disable/enable resize bars when these "pages" open/close
	g_LobbyHandler.leaderboardPage.registerOpenPageHandler(() => { g_resizeBarManager.ghostMode = true })
	g_LobbyHandler.leaderboardPage.registerClosePageHandler(() => { g_resizeBarManager.ghostMode = false })
	g_LobbyHandler.profilePage.registerClosePageHandler(() => { g_resizeBarManager.ghostMode = false })

	autociv_focus.chatInput();
	g_LobbyHandler.lobbyPage.autocivLobbyStats = new AutocivLobbyStats()

	initChatFilterInput()
});

// Start the lobby chat input with s? to filter all the chat messages, remove s? to disable
function initChatFilterInput()
{
	let active = false
	let searchText = ""

	const chatInput = Engine.GetGUIObjectByName("chatInput")
	const chatText = Engine.GetGUIObjectByName("chatText")
	let originalList = []

	autociv_patchApplyN(ChatMessagesPanel.prototype, "addText", function (target, that, args)
	{
		if (active)
		{
			chatText.list = originalList
		}
		const res = target.apply(that, args)
		if (active)
		{
			originalList = chatText.list
			chatText.list = originalList.filter(t => t.includes(searchText))
		}
		return res
	})

	/*NOTE - Search with "s?"
	This code snippet is an event handler that is triggered when the user types in a chat input.
	It checks if the text in the chat input starts with "s?".
	If so, it updates the chatText.list to only display items that include the search text.
	If the user is not in filter mode, it restores the original list of chat items.
	*/
	// This might cause some other functionality to stop working
	chatInput.onTextEdit = () =>
	{
		const text = chatInput.caption
		const inFilterMode = text.startsWith("s?")

		if(inFilterMode && !active)
		{
			originalList = chatText.list
		}

		if (inFilterMode)
		{
			active = true

			searchText = text.slice(2).trimStart()
			if(false){
				chatText.list = originalList.filter(t => t.includes(searchText))
			}else{ // new. regex offers more options
				const regex = new RegExp(searchText);
				warn(searchText)
				chatText.list = originalList.filter(t => regex.test(t));
			}


			warn('cursor at beginning + [tab] ==> chat is copied to the chat text')
		}
		else
		{
			if (!active) return
			active = false
			chatText.list = originalList
		}
	}
}

class AutocivLobbyStats
{
	lobbyPageTitle = Engine.GetGUIObjectByName("lobbyPageTitle")
	nOfPlayers = 0
	nOfGames = 0
	pageTitle = this.lobbyPageTitle.caption

	constructor()
	{
		// I suppose the page handlers have been loaded before this one, so should work out
		this.nOfGames = g_LobbyHandler.lobbyPage.lobbyPage.panels.gameList.gameList.length
		this.nOfPlayers = g_LobbyHandler.lobbyPage.lobbyPage.panels.playerList.nickList.length
		this.update()

		g_LobbyHandler.xmppMessages.registerXmppMessageHandler("game", "gamelist", () =>
		{
			// I suppose the page handlers have been loaded before this one, so should work out
			this.nOfGames = g_LobbyHandler.lobbyPage.lobbyPage.panels.gameList.gameList.length
			this.update()
		});

		g_LobbyHandler.xmppMessages.registerPlayerListUpdateHandler(() =>
		{
			// I suppose the page handlers have been loaded before this one, so should work out
			this.nOfPlayers = g_LobbyHandler.lobbyPage.lobbyPage.panels.playerList.nickList.length
			this.update()
		})
	}

	update ()
	{
		this.lobbyPageTitle.caption = `${this.pageTitle}  P:${this.nOfPlayers}  G:${this.nOfGames}`
	}
}
autociv_patchApplyN(ProfilePage.prototype, "openPage", function (target, that, args)
{
    g_resizeBarManager.ghostMode = true
    return target.apply(that, args)
})
/**
 * This class fetches and displays player profile data,
 * where the player had been selected in the playerlist or leaderboard.
 */
class ProfilePanel
{
	constructor(xmppMessages, playerList, leaderboardPage)
	{
		// Playerlist or leaderboard selection
		this.requestedPlayer = undefined;

		// Playerlist selection
		this.selectedPlayer = undefined;

		this.rankIcon = Engine.GetGUIObjectByName("rankIcon");
		this.roleText = Engine.GetGUIObjectByName("roleText");
		this.ratioText = Engine.GetGUIObjectByName("ratioText");
		this.lossesText = Engine.GetGUIObjectByName("lossesText");
		this.winsText = Engine.GetGUIObjectByName("winsText");
		this.totalGamesText = Engine.GetGUIObjectByName("totalGamesText");
		this.highestRatingText = Engine.GetGUIObjectByName("highestRatingText");
		this.rankText = Engine.GetGUIObjectByName("rankText");
		this.fade = Engine.GetGUIObjectByName("fade");
		this.playernameText = Engine.GetGUIObjectByName("playernameText");
		this.profileArea = Engine.GetGUIObjectByName("profileArea");

		xmppMessages.registerXmppMessageHandler("game", "profile", this.onProfile.bind(this));
		xmppMessages.registerXmppMessageHandler("chat", "role", this.onRoleChange.bind(this));

		playerList.registerSelectionChangeHandler(this.onPlayerListSelection.bind(this));

		leaderboardPage.registerOpenPageHandler(this.onLeaderboardOpenPage.bind(this));
		leaderboardPage.registerClosePageHandler(this.onLeaderboardClosePage.bind(this));
		leaderboardPage.leaderboardList.registerSelectionChangeHandler(this.onLeaderboardSelectionChange.bind(this));
	}

	onPlayerListSelection(playerName)
	{
		this.selectedPlayer = playerName;
		this.requestProfile(playerName);
	}

	onRoleChange(message)
	{
		if (message.nick == this.requestedPlayer)
			this.updatePlayerRoleText(this.requestedPlayer);
	}

	onLeaderboardOpenPage(playerName)
	{
		this.requestProfile(playerName);
	}

	onLeaderboardSelectionChange(playerName)
	{
		this.requestProfile(playerName);
	}

	onLeaderboardClosePage()
	{
		this.requestProfile(this.selectedPlayer);
	}

	updatePlayerRoleText(playerName)
	{
		switch (playerName)
		{
		case "Ratings":
		case "WFGBot":
		case "WFGbot":
			this.roleText.caption = "Beep Boop";
			return;
		case "Stan`":
		case "stanleysweet":
			this.roleText.caption = "Project Manager";
			return;
		default:
			this.roleText.caption = this.RoleNames[Engine.LobbyGetPlayerRole(playerName) || "participant"];
			return;
		}
	}

	requestProfile(playerName)
	{
		this.profileArea.hidden = !playerName && !this.playernameText.caption;
		this.requestedPlayer = playerName;
		if (!playerName)
			return;

		this.playernameText.caption = PlayerColor.ColorPlayerName(escapeText(playerName));
		this.updatePlayerRoleText(playerName);

		this.rankText.caption = this.NotAvailable;
		this.rankIcon.caption = "";
		this.highestRatingText.caption = this.NotAvailable;
		this.totalGamesText.caption = this.NotAvailable;
		this.winsText.caption = this.NotAvailable;
		this.lossesText.caption = this.NotAvailable;
		this.ratioText.caption = this.NotAvailable;

		Engine.SendGetProfile(playerName);
	}

	onProfile()
	{
		const attributes = Engine.GetProfile()[0];
		if (attributes.rating == "-2" || attributes.player != this.requestedPlayer)
			return;

		this.playernameText.caption = PlayerColor.ColorPlayerName(escapeText(attributes.player), attributes.rating);
		this.updatePlayerRoleText(attributes.player);

		this.rankText.caption = attributes.rank;
		this.highestRatingText.caption = attributes.highestRating;
		this.totalGamesText.caption = attributes.totalGamesPlayed;
		this.winsText.caption = attributes.wins;
		this.lossesText.caption = attributes.losses;
		this.ratioText.caption = ProfilePanel.FormatWinRate(attributes);
		const ratingNumberIcon = parseInt(attributes.rating, 10);

		// switch (true)
		// {
		// case (attributes.rank == "1"):
		// 	this.roleText.caption = "Ruler";
		// 	this.rankIcon.caption = sprintf("%(icon_highest_rank)s", { "icon_highest_rank": '[icon="icon_highest_rank" displace="0 3"]' });
		// 	return;
		// case (ratingNumberIcon > 1600):
		// 	this.roleText.caption = "Conqueror";
		// 	this.rankIcon.caption = sprintf("%(icon_above_1600)s", { "icon_above_1600": '[icon="icon_above_1600" displace="0 3"]' });
		// 	return;
		// case (ratingNumberIcon > 1400):
		// 	this.roleText.caption = "Champion";
		// 	this.rankIcon.caption = sprintf("%(icon_above_1400)s", { "icon_above_1400": '[icon="icon_above_1400" displace="0 3"]' });
		// 	return;
		// case (ratingNumberIcon > 1200):
		// 	this.roleText.caption = "Warrior";
		// 	this.rankIcon.caption = sprintf("%(icon_above_1200)s", { "icon_above_1200": '[icon="icon_above_1200" displace="0 3"]' });
		// 	return;
		// case (ratingNumberIcon > 1000):
		// 	this.roleText.caption = "Footsoldier";
		// 	this.rankIcon.caption = sprintf("%(icon_above_1000)s", { "icon_above_1000": '[icon="icon_above_1000" displace="0 3"]' });
		// 	return;
		// case (ratingNumberIcon <= 1000):
		// 	this.roleText.caption = "n00b";
		// 	this.rankIcon.caption = sprintf("%(icon_below_1000)s", { "icon_below_1000": '[icon="icon_below_1000" displace="0 3"]' });
		// 	return;
		// default:
		// 	this.rankIcon.caption = "";
		// 	return;
		// }
	}
}

ProfilePanel.prototype.NotAvailable = translate("N/A");

/**
 * These role names correspond to the names constructed by the XmppClient.
 */
ProfilePanel.prototype.RoleNames = {
	"moderator": translate("Moderator"),
	"participant": "",
	"visitor": ""
};

ProfilePanel.FormatWinRate = function(attr)
{
	if (!attr.totalGamesPlayed)
		return translateWithContext("Used for an undefined winning rate", "-");

	return sprintf(translate("%(percentage)s%%"), {
		"percentage": (attr.wins / attr.totalGamesPlayed * 100).toFixed(0)
	});
};
/**
 * The purpose of this class is to display information about the selected game.
 */
class GameDetails
{
	constructor(dialog, gameList, mapCache)
	{
		this.mapCache = mapCache;

		this.playernameArgs = {};
		this.playerCountArgs = {};
		this.gameStartArgs = {};

		this.lastGame = {};

		this.gameDetails = Engine.GetGUIObjectByName("gameDetails");

		this.sgMapName = Engine.GetGUIObjectByName("sgMapName");
		this.sgGame = Engine.GetGUIObjectByName("sgGame");
		this.sgDescription = Engine.GetGUIObjectByName("sgDescription");
		this.sgMapSize = Engine.GetGUIObjectByName("sgMapSize");
		this.sgMapPreview = Engine.GetGUIObjectByName("sgMapPreview");

		gameList.registerSelectionChangeHandler(this.onGameListSelectionChange.bind(this));

		this.resize(dialog);
	}

	resize(dialog)
	{
		const bottom = Engine.GetGUIObjectByName(dialog ? "leaveButton" : "joinButton").size.top - 5;
		const size = this.gameDetails.size;
		size.bottom = bottom;
		this.gameDetails.size = size;
	}

	/**
	 * Populate the game info area with information on the current game selection.
	 */
	onGameListSelectionChange(game)
	{
		this.gameDetails.hidden = !game;
		if (!game)
			return;

		Engine.ProfileStart("GameDetails");

		const stanza = game.stanza;
		const displayData = game.displayData;

		if (stanza.mapType != this.lastGame.mapType || stanza.mapName != this.lastGame.mapName)
		{
			this.sgMapName.caption = displayData.mapType + "/" + displayData.mapName;
			if (this.mapCache.checkIfExists(stanza.mapType, stanza.mapName))
				this.sgMapPreview.sprite = this.mapCache.getMapPreview(stanza.mapType, stanza.mapName);
			else
				this.sgMapPreview.sprite = this.mapCache.getMapPreview(stanza.mapType);
		}

		{
			let txt = escapeText(stanza.name);

			this.playernameArgs.playername = escapeText(stanza.hostUsername);

			if (stanza.startTime)
			{
				this.gameStartArgs.time =
				Math.round((Date.now() - stanza.startTime * 1000) / (1000 * 60));
				txt += sprintf(this.GameStartFormat, this.gameStartArgs);
			}

			this.sgGame.caption = setStringTags(txt, this.isCompatible ? Game.prototype.IncompatibleTags : Game.prototype.StateTags[stanza.state]);

			const textHeight = this.sgGame.getTextSize().height + 12;

			const sgGameSize = this.sgGame.size;
			sgGameSize.bottom = textHeight;
			this.sgGame.size = sgGameSize;
		}

		{
			// Victory condition, map type and size
			let txt = setStringTags(this.VictoryConditionsFormat, this.CaptionTags) + " " +
				(stanza.victoryConditions ?
					stanza.victoryConditions.split(",").map(translateVictoryCondition).join(this.Comma) :
					translateWithContext("victory condition", "Endless Game"));

			txt +=
				"\n" + setStringTags(this.MapSizeFormat, this.CaptionTags) + " " + displayData.mapSize;

			// Player information
			txt += "\n\n";
			this.playerCountArgs.current = escapeText(stanza.nbp);
			this.playerCountArgs.total = escapeText(stanza.maxnbp);
			txt += setStringTags(sprintf(this.PlayerCountFormat, this.playerCountArgs), this.CaptionTags) + setStringTags(sprintf(this.HostFormat, this.playernameArgs), this.HostFormatCaptionTags);

			txt += "\n" + formatPlayerInfo(game.players);

			// Mod information
			txt += "\n\n";
			if (!game.isCompatible)
				txt += setStringTags(coloredText(setStringTags(this.IncompatibleModsFormat, this.CaptionTags), "red"), {
					"tooltip": sprintf(translate("You have some incompatible mods:\n%(details)s"), {
						"details": comparedModsString(game.mods, Engine.GetEngineInfo().mods)
					})
				});
			else
				txt += setStringTags(this.ModsFormat, this.CaptionTags);

			const sortedMods = game.mods;
			sortedMods.sort((a, b) => a.ignoreInCompatibilityChecks - b.ignoreInCompatibilityChecks);
			for (const mod of sortedMods)
			{
				let modStr = escapeText(modToString(mod));
				if (mod.ignoreInCompatibilityChecks)
					modStr = setStringTags(coloredText(modStr, "180 180 180"), {
						"tooltip": translate("This mod does not affect MP compatibility HFall :)")
					});
				txt += "\n" + modStr;
			}

			// Map description
			txt += "\n\n" + setStringTags(this.MapDescriptionFormat, this.CaptionTags) + "\n" + displayData.mapDescription;

			this.sgDescription.caption = txt;

			// Resize the box
			const textHeight = this.sgDescription.getTextSize().height;
			const size = this.sgDescription.size;
			size.top = this.sgGame.size.bottom + 5;
			this.sgDescription.size = size;
		}

		this.lastGame = game;
		Engine.ProfileStop();
	}
}

GameDetails.prototype.HostFormat = translate("  (hosted by %(playername)s)");

GameDetails.prototype.HostFormatCaptionTags = {
	"color": "163 162 160"
};

GameDetails.prototype.PlayerCountFormat = translate("Players: %(current)s/%(total)s");

GameDetails.prototype.VictoryConditionsFormat = translate("Victory Conditions:");

// Translation: Comma used to concatenate victory conditions
GameDetails.prototype.Comma = translate(", ");

GameDetails.prototype.ModsFormat = translate("Mods:");

GameDetails.prototype.IncompatibleModsFormat = translate("Mods (incompatible):");

// Translation: %(time)s is the hour and minute here.
GameDetails.prototype.GameStartFormat = translate(" (%(time)smin)");

GameDetails.prototype.MapSizeFormat = translate("Map Size:");

GameDetails.prototype.MapDescriptionFormat = translate("Map Description:");

GameDetails.prototype.CaptionTags = {
	"font": "sans-bold-16",
	"color": "255 185 0"
};
/**
 * Status messages are textual event notifications triggered by local events.
 * The messages may be colorized, hence the caller needs to apply escapeText on player input.
 */
class SystemMessageFormat
{
	constructor()
	{
		this.args = {
			"system": setStringTags(this.System, this.SystemTags)
		};
	}

	format(text)
	{
		this.args.message = text;
		return setStringTags(
			sprintf(this.MessageFormat, this.args),
			this.MessageTags);
	}
}

SystemMessageFormat.prototype.System =
	// Translation: Caption for system notifications shown in the chat panel
	translate("System:");

SystemMessageFormat.prototype.SystemTags = {
	"color": "200 0 0"
};

SystemMessageFormat.prototype.MessageFormat =
	translate("=== %(system)s %(message)s");

SystemMessageFormat.prototype.MessageTags = {
	"font": "sans-stroke-16",
	"color": "255 127 0"
};
/**
 * Status messages are textual event notifications triggered by multi-user chat room actions.
 */
class StatusMessageFormat
{
	constructor()
	{
		this.args = {};
	}

	/**
	 * escapeText is the responsibility of the caller.
	 */
	format(text)
	{
		this.args.message = text;
		return setStringTags(
			sprintf(this.MessageFormat, this.args),
			this.MessageTags);
	}
}

StatusMessageFormat.prototype.MessageFormat =
	// Translation: Chat status message
	translate("== %(message)s");

StatusMessageFormat.prototype.MessageTags = {
	"font": "sans-stroke-14",
	"color": "163 162 160"
};
autociv_patchApplyN(ChatMessageEvents.Subject.prototype, "onSubjectChange", function (target, that, args)
{
    if (Engine.ConfigDB_GetValue("user", "autociv.lobby.chat.subject.hide") == "true")
        return;
    return target.apply(that, args);
});

ChatInputPanel.prototype.getAutocompleteList = function ()
{
    let list = []
    Array.prototype.push.apply(list, Engine.GetPlayerList().map(player => player.name))
    Array.prototype.push.apply(list, Engine.GetGameList().map(v => v.name))
    Array.prototype.push.apply(list, Object.keys(ChatCommandHandler.prototype.ChatCommands).map(v => `/${v}`))
    return list
}

ChatInputPanel.prototype.autocomplete = function ()
{
    // selfMessage('13 call autoCompleteText() ---------------')
    // try {
        autoCompleteText(this.chatInput, this.getAutocompleteList())
    // } catch (error) {
        // selfMessage('17: autoCompleteText failed ')
    // }
    // selfMessage('14 23-0628_0047-31')
}
/**
 * This class formats a chat message that was not formatted with any commands.
 * The nickname and the message content will be assumed to be player input, thus escaped,
 * meaning that one cannot use colorized messages here.
 */
class ChatMessageFormatSay
{
	constructor()
	{
		this.senderArgs = {};
		this.messageArgs = {};
	}

	/**
	 * Sender is formatted, escapeText is the responsibility of the caller.
	 */
	format(sender, text)
	{
		this.senderArgs.sender = sender;
		// warn(`20: sender is ${sender}`);
		this.messageArgs.message = text;

		// Remove color tags using regex

		const temp = `${sender}: ${text}`; // all senders. inclusive yourself
		// you could get it by pressing tab in a empty chat. so you could last message in your caption. then you could copy it. often missed opterionity to copy a text.
		// if you login in the lobby it reads all messages. later it readys the last message only

		g_chat_draft

		if(Engine.ConfigDB_GetValue("user", "autocivP.chat.copyAllChatMessages") !== "true" )
			g_chatTextInInputFild_when_msgCommand = ''

		g_chatTextInInputFild_when_msgCommand += temp.replace(/\[([^\[\]]*)\]/g, '') + "\n" ; // usually colors in usernames
		g_chatTextInInputFild_when_msgCommand_lines++

		// warn(`22: ${g_backupMessageBeforeChangeContextViaHotkey}`);

		this.messageArgs.sender = setStringTags(
			sprintf(this.ChatSenderFormat, this.senderArgs),
			this.SenderTags);

		return sprintf(this.ChatMessageFormat, this.messageArgs);
	}
}

ChatMessageFormatSay.prototype.ChatSenderFormat = translate("<%(sender)s>");

ChatMessageFormatSay.prototype.ChatMessageFormat = translate("%(sender)s %(message)s");

/**
 * Used for highlighting the sender of chat messages.
 */
ChatMessageFormatSay.prototype.SenderTags = {
	"font": "sans-stroke-16"
};
ChatCommandHandler.prototype.ChatCommands["pingall"] = {
    "description": translate("Ping all 'Online' and 'Observer' players."),
    "ignoredUsers": new Set(),
    "ignoreListConfigKey": "autociv.lobby.pingPlayers.ignoreList",
    "handler": function (args)
    {
        // the caller changes function call context, must grab original one
        const that = this.ChatCommands["pingall"]
        that.init()
        const selfNick = Engine.LobbyGetNick();
        const ignore = new Set([selfNick]);
        const candidatesToAnnoy = new Set();

        const gameList = g_LobbyHandler.lobbyPage.lobbyPage.panels.gameList.gameList;
        for (let game of gameList) {
            const players = game.players;
            const selfInHost = players.some(player => splitRatingFromNick(player.Name).nick == selfNick);

            for (let player of players)
                if (selfInHost){
                    ignore.add(splitRatingFromNick(player.Name).nick);
                    g_selfIsHost = selfInHost
                }
                else if (player.Team == "observer")
                    candidatesToAnnoy.add(splitRatingFromNick(player.Name).nick);
        }

        for (let player of Engine.GetPlayerList())
            if (player.presence == "available")
                candidatesToAnnoy.add(player.name);

        for (let v of ignore)
            candidatesToAnnoy.delete(v);

        for (let v of that.ignoredUsers)
            candidatesToAnnoy.delete(v);

        const annoyList = Array.from(candidatesToAnnoy).join(", ");

        Engine.LobbySendMessage(annoyList);
        if (args.trim())
            Engine.LobbySendMessage(args)

        return true;
    },
    "init": function () {
        if (this.__alreadyInit) return
        this.__alreadyInit = true

        this.loadIgnoredUserList()
        registerConfigChangeHandler(this.onConfigChanges.bind(this));
    },
    "loadIgnoredUserList": function () {
        let value = Engine.ConfigDB_GetValue("user", this.ignoreListConfigKey);
        this.ignoredUsers = new Set(value.split(",").map((value) => value.trim()));
    },
    "onConfigChanges": function (changes) {
        if (changes.has(this.ignoreListConfigKey))
            this.loadIgnoredUserList()
    }
};

ChatCommandHandler.prototype.ChatCommands["pingall"]["playing"] = {
    "description": translate("Set your state to 'Playing'."),
    "handler": function ()
    {
        Engine.LobbySetPlayerPresence("playing");
        return true;
    }
};
PlayerList = new Proxy(PlayerList, {
  construct: function (target, args) {
    const autociv_playersBox_preferences = new ConfigJSON(
      "playersBox",
      true,
      false
    );
    const playersBox = Engine.GetGUIObjectByName("playersBox");

    for (let id of autociv_playersBox_preferences.getIds())
      playersBox[id] = autociv_playersBox_preferences.getValue(id);

    let instance = new target(...args);
    instance.autociv_playersBox_preferences = autociv_playersBox_preferences;
    return instance;
  },
});

autociv_patchApplyN(
  PlayerList.prototype,
  "onPlayerListSelection",
  function (target, that, args) {
    if (that.autociv_playersBox_preferences) {
      const needsSave = ["selected_column", "selected_column_order"]
        .map((id) => {
          let old = that.autociv_playersBox_preferences.getValue(id);
          if (old == that.playersBox[id]) return false;
          that.autociv_playersBox_preferences.setValue(id, that.playersBox[id]);
          return true;
        })
        .some((v) => v);

      if (needsSave) {
        that.autociv_playersBox_preferences.save();
      }
    }

    return target.apply(that, args);
  }
);
/**
 * This class manages the button that allows the player to display the last summary.
 */
class LastSummaryButton
{
	constructor(dialog)
	{
		this.lastSummaryButton = Engine.GetGUIObjectByName("lastSummaryButton");
		this.lastSummaryButton.onPress = this.onPress.bind(this);
		this.lastSummaryButton.caption = translate("Last Score");
		this.lastSummaryButton.enabled = !dialog;
	}

	onPress()
	{
		const replays = Engine.GetReplays(false);
		if (!replays.length)
		{
			messageBox(500, 200, translate("No replays data available."), translate("Error"));
			return;
		}

		const lastReplay = replays.reduce((a, b) => a.attribs.timestamp > b.attribs.timestamp ? a : b);
		if (!lastReplay)
		{
			messageBox(500, 200, translate("No last replay data available."), translate("Error"));
			return;
		}

		const simData = Engine.GetReplayMetadata(lastReplay.directory);
		if (!simData)
		{
			messageBox(500, 200, translate("No summary data available."), translate("Error"));
			return;
		}

		const isReplayCompatible = hasSameMods(lastReplay.attribs.mods, Engine.GetEngineInfo().mods);
		const gameMods = lastReplay.attribs.mods || [];
		if (!isReplayCompatible)
		{
			messageBox(500, 200, translate("This summary needs a different sequence of mods:") + "\n\n" +
			comparedModsString(gameMods, Engine.GetEngineInfo().mods), translate("Incompatible summary"));
			return;
		}

		Engine.LobbySetPlayerPresence("playing");
		Engine.PushGuiPage("page_summary.xml", {
			"sim": simData,
			"gui": {
				"replayDirectory": lastReplay.directory,
				"isInLobby": true,
				"ingame": false,
				"dialog": true
			}
		});
	}
}
/**
 * This class manages the button that allows the player to go to see the civilizations info.
 */
class CivilizationLobbyButton
{
	constructor()
	{
		this.civInfo = {
			"civ": "",
			"page": "page_civinfo.xml"
		};
		this.civilizationLobbyButton = Engine.GetGUIObjectByName("civilizationLobbyButton");
		this.civilizationLobbyButton.onPress = this.onPress.bind(this);
		this.civilizationLobbyButton.caption = translate("Civilization");

		Engine.SetGlobalHotkey("structree", "Press", this.openPage.bind(this, "page_structree.xml"));
		Engine.SetGlobalHotkey("civinfo", "Press", this.openPage.bind(this, "page_civinfo.xml"));
	}

	onPress()
	{
		this.openPage(this.civInfo.page);
	}

	openPage(page)
	{
		Engine.PushGuiPage(
			page,
			{ "civ": this.civInfo.civ },
			this.storeCivInfoPage.bind(this));
	}

	storeCivInfoPage(data)
	{
		if (data.nextPage)
			Engine.PushGuiPage(
				data.nextPage,
				{ "civ": data.civ },
				this.storeCivInfoPage.bind(this));
		else
			this.civInfo = data;
	}
}
/**
 * This class manages the button that allows the player to display the options page.
 */
class OptionsButton
{
	constructor()
	{
		this.optionsButton = Engine.GetGUIObjectByName("optionsButton");
		this.optionsButton.onPress = this.onPress.bind(this);
		this.optionsButton.caption = translate("Options");
	}

	onPress()
	{
		Engine.PushGuiPage("page_options.xml");
	}
}
/**
 * This class manages the button that allows the player to display the replay page.
 */
class ReplayButton
{
	constructor(dialog)
	{
		this.replayButton = Engine.GetGUIObjectByName("replayButton");
		this.replayButton.onPress = this.onPress.bind(this);
		this.replayButton.caption = translate("Replays");
		this.replayButton.enabled = !dialog;
	}

	onPress()
	{
		Engine.LobbySetPlayerPresence("playing");
		Engine.PushGuiPage("page_replaymenu.xml",
			{
				"replaySelectionData": {
					"filters": {
						"compatibility": false,
						"singleplayer": "Multiplayer"
					}
				}
			});
	}
}
/**
 * This class manages the button that allows the player to display the hotkey page.
 */
class HotkeyButton
{
	constructor()
	{
		this.hotkeyButton = Engine.GetGUIObjectByName("hotkeyButton");
		this.hotkeyButton.onPress = this.onPress.bind(this);
		this.hotkeyButton.caption = translate("Hotkeys");
	}

	onPress()
	{
		Engine.PushGuiPage("hotkeys/page_hotkeys.xml");
	}
}
/**
 * This class manages the button that allows the player to go to the forum.
 */
class ForumButton
{
	constructor()
	{
		this.forumButton = Engine.GetGUIObjectByName("forumButton");
		this.forumButton.onPress = this.onPress.bind(this);
		this.forumButton.caption = translate("Forum");
	}

	onPress()
	{
		Engine.OpenURL("https://wildfiregames.com/forum/index.php?/discover/");
	}
}

// NOTE: in a24 we can no longer know if host is stun or port forward
autociv_patchApplyN(GameList.prototype, "rebuildGameList", function (target, that, args)
{
    let result = target.apply(that, args);

    if (Engine.ConfigDB_GetValue("user", "autociv.lobby.gamelist.showHostName") != "true")
        return;

    let gamesBox = Engine.GetGUIObjectByName("gamesBox");
    gamesBox.list_gameName = gamesBox.list_gameName.map((v, i) =>
        `${v} [color="90 90 90"]\\ - ${that.gameList[i]?.stanza?.hostUsername ?? ""}[/color]`
    );

    gamesBox.list = gamesBox.list;
    return result;
})
function autociv_reregister()
{
	const autociv_stanza = new ConfigJSON("stanza", false);

	if (!autociv_stanza.hasValue("gamesetup"))
		return;

	const gamesetup = autociv_stanza.getValue("gamesetup");

	const registered = () =>
	{
		g_LobbyHandler.lobbyPage.lobbyPage.panels.gameList.gameList.
			some(entry => entry.stanza.hostUsername == gamesetup.hostUsername);
	}

	setTimeout(() =>
	{
		if (!Engine.HasNetServer() ||
			!Engine.IsXmppClientConnected())
			return;

		warn("Autociv: Reregistering game to lobby")
		Engine.SendRegisterGame(gamesetup);

		setTimeout(() =>
		{
			if (!Engine.HasNetServer() ||
				!Engine.IsXmppClientConnected() ||
				!autociv_stanza.hasValue("session"))
				return;

			if (!registered())
				return;

			warn("Autociv: Sending last game changes")
			const session = autociv_stanza.getValue("session");
			Engine.SendChangeStateGame(session.connectedPlayers, session.minPlayerData);

		}, 2500)

	}, 2500)

}

function autociv_reconnect()
{
	Engine.ConnectXmppClient();
	autociv_reregister();
}

autociv_patchApplyN(ConnectionHandler.prototype, "askReconnect", function (target, that, args)
{
	messageBox(
		400, 200,
		translate("You have been disconnected from the lobby. Do you want to reconnect?"),
		translate("Confirmation"),
		[translate("No"), translate("Yes")],
		[null, autociv_reconnect]);
})
/**
 * This class is concerned with displaying players who are online and
 * triggering handlers when selecting or doubleclicking on a player.
 */
class PlayerList
{
	constructor(xmppMessages, buddyButton, gameList)
	{
		this.gameList = gameList;
		this.selectedPlayer = undefined;
		this.statusOrder = Object.keys(this.PlayerStatuses);

		// Avoid repeated array construction for performance
		this.buddyStatusList = [];
		this.playerList = [];
		this.presenceList = [];
		this.nickList = [];
		this.ratingList = [];

		this.playersFilter = Engine.GetGUIObjectByName("playersFilter");
		this.playersFilter.onPress = this.selectPlayer.bind(this);
		this.playersFilter.onTab = this.autocomplete.bind(this);
		this.playersFilter.placeholder_text = "";
		this.playersFilter.tooltip = colorizeAutocompleteHotkey();

		this.selectionChangeHandlers = new Set();
		this.mouseLeftDoubleClickItemHandlers = new Set();

		this.playersBox = Engine.GetGUIObjectByName("playersBox");
		this.playersBox.onSelectionChange = this.onPlayerListSelection.bind(this);
		this.playersBox.onSelectionColumnChange = this.rebuildPlayerList.bind(this);
		this.playersBox.onMouseLeftClickItem = this.onMouseLeftClickItem.bind(this);
		this.playersBox.onMouseLeftDoubleClickItem = this.onMouseLeftDoubleClickItem.bind(this);

		buddyButton.registerBuddyChangeHandler(this.onBuddyChange.bind(this));
		xmppMessages.registerPlayerListUpdateHandler(this.rebuildPlayerList.bind(this));
		this.registerSelectionChangeHandler(buddyButton.onPlayerSelectionChange.bind(buddyButton));
		this.registerMouseLeftDoubleClickItemHandler(buddyButton.onPress.bind(buddyButton));

		this.rebuildPlayerList();
	}

	selectPlayer()
	{
		const index = this.playersBox.list.indexOf(this.playersFilter.caption);
		if (index != -1)
			this.playersBox.selected = index;
	}

	autocomplete()
	{
		autoCompleteText(
			this.playersFilter,
			Engine.GetPlayerList().map(player => player.name));
	}

	registerSelectionChangeHandler(handler)
	{
		this.selectionChangeHandlers.add(handler);
	}

	registerMouseLeftDoubleClickItemHandler(handler)
	{
		this.mouseLeftDoubleClickItemHandlers.add(handler);
	}

	onBuddyChange()
	{
		this.rebuildPlayerList();
	}

	onMouseLeftDoubleClickItem()
	{
		for (const handler of this.mouseLeftDoubleClickItemHandlers)
			handler();
	}

	onMouseLeftClickItem()
	{
		// In case of clicking on the same player again
		this.gameList.selectGameFromPlayername(this.selectedPlayer);
	}


	onPlayerListSelection()
	{
		if (this.playersBox.selected == this.playersBox.list.indexOf(this.selectedPlayer))
			return;

		this.selectedPlayer = this.playersBox.list[this.playersBox.selected];

		this.gameList.selectGameFromPlayername(this.selectedPlayer);

		for (const handler of this.selectionChangeHandlers)
			handler(this.selectedPlayer);
	}

	parsePlayer(sortKey, player)
	{
		player.isBuddy = g_Buddies.indexOf(player.name) != -1;

		switch (sortKey)
		{
		case "buddy":
			player.sortValue = (player.isBuddy ? 1 : 2) + this.statusOrder.indexOf(player.presence) + player.name.toLowerCase();
			break;
		case "rating":
			player.sortValue = +player.rating;
			break;
		case "status":
			player.sortValue = this.statusOrder.indexOf(player.presence) + player.name.toLowerCase();
			break;
		case "name":
		default:
			player.sortValue = player.name.toLowerCase();
			break;
		}
	}

	/**
	 * Do a full update of the player listing, including ratings from cached C++ information.
	 * Important: This should be done just once if
	 * there have been multiple messages received changing this list.
	 */
	rebuildPlayerList()
	{
		Engine.ProfileStart("rebuildPlaersList");

		Engine.ProfileStart("getPlayerList");
		const playerList = Engine.GetPlayerList();
		Engine.ProfileStop();

		Engine.ProfileStart("parsePlayers");
		playerList.forEach(this.parsePlayer.bind(this, this.playersBox.selected_column));
		Engine.ProfileStop();

		Engine.ProfileStart("sortPlayers");
		playerList.sort(this.sortPlayers.bind(this, this.playersBox.selected_column_order));
		Engine.ProfileStop();

		Engine.ProfileStart("prepareList");
		const length = playerList.length;
		this.playersFilter.placeholder_text = `Search for Player  (${length} online)`;
		this.buddyStatusList.length = length;
		this.playerList.length = length;
		this.presenceList.length = length;
		this.nickList.length = length;
		this.ratingList.length = length;

		playerList.forEach((player, i) => {
			// TODO: COList.cpp columns should support horizontal center align
			const rating = player.rating ? ("     " + player.rating).substr(-5) : "     -";

			const presence = this.PlayerStatuses[player.presence] ? player.presence : "unknown";
			if (presence == "unknown")
				warn("Unknown presence:" + player.presence);

			const statusTags = this.PlayerStatuses[presence].tags;
			this.buddyStatusList[i] = player.isBuddy ? setStringTags(g_BuddySymbol, statusTags) : "";
			this.playerList[i] = PlayerColor.ColorPlayerName(player.name, "", player.role);
			this.presenceList[i] = setStringTags(this.PlayerStatuses[presence].status, statusTags);
			this.ratingList[i] = setStringTags(rating, statusTags);
			this.nickList[i] = escapeText(player.name);
		});
		Engine.ProfileStop();

		Engine.ProfileStart("copyToGUI");
		this.playersBox.list_buddy = this.buddyStatusList;
		this.playersBox.list_name = this.playerList;
		this.playersBox.list_status = this.presenceList;
		this.playersBox.list_rating = this.ratingList;
		this.playersBox.list = this.nickList;
		Engine.ProfileStop();

		Engine.ProfileStart("selectionChange");
		this.playersBox.selected = this.playersBox.list.indexOf(this.selectedPlayer);
		Engine.ProfileStop();

		Engine.ProfileStop();
	}

	sortPlayers(sortOrder, player1, player2)
	{
		if (player1.sortValue < player2.sortValue)
			return -sortOrder;

		if (player1.sortValue > player2.sortValue)
			return +sortOrder;

		return 0;
	}
}

/**
 * The playerlist will be assembled using these values.
 */
PlayerList.prototype.PlayerStatuses = {
	"available": {
		"status": "■",
		"tags": {
			"color": "0 219 0"
		}
	},
	"away": {
		"status": "■",
		"tags": {
			"color": "255 127 0"
		}
	},
	"playing": {
		"status": "■",
		"tags": {
			"color": "200 0 0"
		}
	},
	"offline": {
		"status": "x",
		"tags": {
			"color": "0 0 0"
		}
	},
	"unknown": {
		"status": "?",
		"tags": {
			"color": "178 178 178"
		}
	}
};
/**
 * This class stores the handlers for all GUI objects in the lobby page,
 * (excluding other pages in the same context such as leaderboard and profile page).
 */
class LobbyPage
{
	constructor(dialog, xmppMessages, leaderboardPage, profilePage)
	{
		Engine.ProfileStart("Create LobbyPage");
		const mapCache = new MapCache();
		const buddyButton = new BuddyButton(xmppMessages);
		const gameList = new GameList(xmppMessages, buddyButton, mapCache);
		const playerList = new PlayerList(xmppMessages, buddyButton, gameList);

		this.lobbyPage = {
			"buttons": {
				"buddyButton": buddyButton,
				"hostButton": new HostButton(dialog, xmppMessages),
				"forumButton": new ForumButton(),
				"hotkeyButton": new HotkeyButton(),
				"joinButton": new JoinButton(dialog, gameList),
				"lastSummaryButton": new LastSummaryButton(dialog),
				"leaderboardButton": new LeaderboardButton(xmppMessages, leaderboardPage),
				"optionsButton": new OptionsButton(),
				"profileButton": new ProfileButton(xmppMessages, profilePage),
				"quitButton": new QuitButton(dialog, leaderboardPage, profilePage),
				"replayButton": new ReplayButton(dialog),
				"civilizationLobbyButton": new CivilizationLobbyButton()

			},
			"panels": {
				"chatPanel": new ChatPanel(xmppMessages),
				"gameDetails": new GameDetails(dialog, gameList, mapCache),
				"gameList": gameList,
				"playerList": playerList,
				"profilePanel": new ProfilePanel(xmppMessages, playerList, leaderboardPage),
				"subject": new Subject(dialog, xmppMessages, gameList)
			},
			"eventHandlers": {
				"announcementHandler": new AnnouncementHandler(xmppMessages),
				"connectionHandler": new ConnectionHandler(xmppMessages)
			}
		};

		if (dialog)
			this.setDialogStyle();
		Engine.ProfileStop();
	}

	setDialogStyle()
	{
		{
			const lobbyPage = Engine.GetGUIObjectByName("lobbyPage");
			lobbyPage.sprite = "ModernDialog";

			const size = lobbyPage.size;
			size.left = this.WindowMargin;
			size.top = this.WindowMargin;
			size.right = -this.WindowMargin;
			size.bottom = -this.WindowMargin;
			lobbyPage.size = size;
		}

		{
			const lobbyPageTitle = Engine.GetGUIObjectByName("lobbyPageTitle");
			const size = lobbyPageTitle.size;
			size.top -= this.WindowMargin / 2;
			size.bottom -= this.WindowMargin / 2;
			lobbyPageTitle.size = size;
		}

		{
			const lobbyPanels = Engine.GetGUIObjectByName("lobbyPanels");
			const size = lobbyPanels.size;
			size.top -= this.WindowMargin / 2;
			lobbyPanels.size = size;
		}
	}
}

LobbyPage.prototype.WindowMargin = 40;
// Chop the quantity of messages to process in a tick

const maxJoinLeaveMessagesInLobby = parseInt(Engine.ConfigDB_GetValue("user", "autocivP.msg.maxJoinLeaveMessagesInLobby"))

autociv_patchApplyN(XmppMessages.prototype, "handleMessages", function (target, that, args)
{
    const [getMessages] = args
    Array.prototype.push.apply(that.autociv_messageQueue, getMessages() ?? [])

    // Remove all lobby join & leave messages except the last 30 ones
    {
        let count = 0

        const max = isNaN(maxJoinLeaveMessagesInLobby) ? 30 : maxJoinLeaveMessagesInLobby
        // warn(`${ln1}: max is ${max} (gui/lobby/XmppMessages~autociv.js)`) // not a good place for waarn messages

        that.autociv_messageQueue.reverse()
        that.autociv_messageQueue = that.autociv_messageQueue.filter(msg =>
        {
            if (msg.level == "join" || msg.level == "leave")
                return count++ < max
            return true
        })
        that.autociv_messageQueue.reverse()
    }

    return target.apply(that, [() => that.autociv_messageQueue.splice(0, 80)])
})

XmppMessages.prototype.autociv_messageQueue = []

// React to chat and messages and filter unwanted ones
autociv_patchApplyN(XmppMessages.prototype, "handleMessages", function (target, that, args)
{
    const [getMessages] = args
    return target.apply(that, [() => getMessages()?.filter(msg => !botManager.react(msg))])
})

function init()
{
    Engine.GetGUIObjectByName("buttonWebpage").caption = Engine.Translate("Mod webpage")
    Engine.GetGUIObjectByName("buttonClose").caption = Engine.Translate("Close")
}
