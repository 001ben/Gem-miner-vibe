// Physics aliases
const Engine = Matter.Engine,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Vector = Matter.Vector,
      Body = Matter.Body;

// Ensure Matter is available for export if it's a global
const MatterLocal = window.Matter;

export { Engine, Runner, Bodies, Composite, Events, Vector, Body, MatterLocal as Matter };

export const engine = Engine.create();
// Increase iterations significantly to prevent compound body parts (wings) from drifting under extreme force
engine.positionIterations = 20;
engine.velocityIterations = 20;
engine.constraintIterations = 20;
export const world = engine.world;
engine.gravity.y = 0; // Top down

export const runner = Runner.create();
export const CATEGORIES = {
    DEFAULT: 0x0001,
    DOZER: 0x0002,
    GEM: 0x0004,
    CONVEYOR: 0x0008,
    WALL: 0x0010,
    SHOP_BARRIER: 0x0020
};
