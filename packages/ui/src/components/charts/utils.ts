export interface Scale {
    domain: [number, number];
    range: [number, number];
}

export function scaleLinear(domain: [number, number], range: [number, number]) {
    return (value: number): number => {
        const [d0, d1] = domain;
        const [r0, r1] = range;
        return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
    };
}

export function scaleBand(domain: string[], range: [number, number], padding = 0.1) {
    const step = (range[1] - range[0]) / domain.length;
    const bandwidth = step * (1 - padding);
    const paddingSize = step * padding;

    return {
        scale: (value: string): number => {
            const index = domain.indexOf(value);
            return range[0] + index * step + paddingSize / 2;
        },
        bandwidth,
    };
}

export function extent(data: number[]): [number, number] {
    if (data.length === 0) return [0, 0];
    return [Math.min(...data), Math.max(...data)];
}

export function nice(value: number, round: boolean = false): number {
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const fraction = value / Math.pow(10, exponent);
    let niceFraction: number;

    if (round) {
        if (fraction < 1.5) niceFraction = 1;
        else if (fraction < 3) niceFraction = 2;
        else if (fraction < 7) niceFraction = 5;
        else niceFraction = 10;
    } else {
        if (fraction <= 1) niceFraction = 1;
        else if (fraction <= 2) niceFraction = 2;
        else if (fraction <= 5) niceFraction = 5;
        else niceFraction = 10;
    }

    return niceFraction * Math.pow(10, exponent);
}

export function ticks(domain: [number, number], count = 5): number[] {
    const [min, max] = domain;
    const span = max - min;

    if (span === 0) return [min];

    const step = nice(span / (count - 1), false);
    const start = Math.floor(min / step) * step;
    const end = Math.ceil(max / step) * step;

    const result: number[] = [];
    for (let i = start; i <= end; i += step) {
        if (i >= min && i <= max) {
            result.push(i);
        }
    }

    return result.length > 0 ? result : [min, max];
}

export function formatNumber(value: number): string {
    if (Math.abs(value) >= 1e9) {
        return (value / 1e9).toFixed(1) + 'B';
    }
    if (Math.abs(value) >= 1e6) {
        return (value / 1e6).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1e3) {
        return (value / 1e3).toFixed(1) + 'K';
    }
    return value.toFixed(0);
}
