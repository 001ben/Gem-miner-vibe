import { state } from '../state.js';
import { Bodies, Composite, world } from '../physics.js';
import { removeBodyMesh } from '../graphics.js';

let collector;

export function createCollector() {
    if (collector) {
         removeBodyMesh(collector.id);
         Composite.remove(world, collector);
    }

    const size = 60 + (state.collectorLevel * 20);
    const collectorY = 400;

    collector = Bodies.circle(0, collectorY, size/2, {
        isStatic: true,
        isSensor: true,
        label: 'collector'
    });
    Composite.add(world, collector);
}
