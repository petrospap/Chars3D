import {_INTERNAL} from './UI.ts';

export class Polygon {
points: number[] = [];
children: number[] = [];
area: number = 0.0;
readonly epsilon: number = 1e-6;

    distance(p1, p2) {
        const dx = p1.x - p2.x,
        dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy)
    };

    lerp(p1, p2, t) {
        return {x: (1 - t) * p1.x + t * p2.x, y: (1 - t) * p1.y + t * p2.y}
    };

    cross(p1, p2) {
        return p1.x * p2.y - p1.y * p2.x;
    };

    moveTo(p) {
        this.points.push(p)
    };

    lineTo(p) {
        this.points.push(p)
    };

    close() {
        let cur = this.points[this.points.length - 1];
        this.points.forEach(next => {
            this.area += 0.5 * this.cross(cur, next);
            cur = next;
        })
    };

    conicTo(p, p1) {
        const p0 = this.points[this.points.length - 1],
        dist = this.distance(p0, p1) + this.distance(p1, p),
        steps = Math.max(2, Math.min(_INTERNAL.MAX_BEZIER_STEPS, dist / _INTERNAL.BEZIER_STEP_SIZE));

        for (let i = 1; i <= steps; ++i) {
            const t = i / steps;
            this.points.push(this.lerp(this.lerp(p0, p1, t), this.lerp(p1, p, t), t));
        }
    };

    cubicTo(p, p1, p2) {
        const p0 = this.points[this.points.length - 1],
        dist = this.distance(p0, p1) + this.distance(p1, p2) + this.distance(p2, p),
        steps = Math.max(2, Math.min(_INTERNAL.MAX_BEZIER_STEPS, dist / _INTERNAL.BEZIER_STEP_SIZE));

        for (let i = 1; i <= steps; ++i) {
            const t = i / steps,
            a = this.lerp(this.lerp(p0, p1, t), this.lerp(p1, p2, t), t),
            b = this.lerp(this.lerp(p1, p2, t), this.lerp(p2, p, t), t);
            this.points.push(this.lerp(a, b, t));
        }
    };

    inside(p) {
        //const epsilon = 1e-6;
        let count = 0,
        cur = this.points[this.points.length - 1];

        this.points.forEach(next => {
            const p0 = (cur.y < next.y ? cur : next),
            p1 = (cur.y < next.y ? next : cur);

            if (p0.y < p.y + this.epsilon && p1.y > p.y + this.epsilon) {
                if ((p1.x - p0.x) * (p.y - p0.y) > (p.x - p0.x) * (p1.y - p0.y)) {
                    count++;
                }
            };
            cur = next
        });
        return (count % 2) !== 0
    }
}