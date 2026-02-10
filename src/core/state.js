export const state = {
    money: 0,
    dozerLevel: 1,
    plowLevel: 1,
    plowTeethEnabled: true,
    collectorLevel: 1,
    areaLevel: 1,
    zoneProgress: {
        1: { total: 0, collected: 0 },
        2: { total: 0, collected: 0 },
        3: { total: 0, collected: 0 }
    },
    // Session Telemetry
    session: {
        startTime: Date.now(),
        gemCollectionCount: 0,
        collisionCount: 0,
        distanceTraveled: 0,
        lastPosition: { x: 0, y: 0 }
    }
};

export const costs = {
    dozer: 100,
    plow: 100,
    collector: 150,
    area: 500
};
