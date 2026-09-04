#!/usr/bin/env python3
"""Mathematical and Monte-Carlo audit for POTAMORSE.

Pure standard-library Python.  The engine below is intentionally separate from
index.html so the claims in DESIGN_NOTES.md can be reproduced without a browser.

Examples
--------
Quick check:
    python3 balance.py --legs 2000 --matches 2000 --skill 200

Numbers used in BALANCE_REPORT.md:
    python3 balance.py --legs 30000 --matches 30000 --skill 500 --json
"""
from __future__ import annotations

import argparse
import json
import math
import random
import statistics
import time
from collections import Counter
from dataclasses import dataclass
from typing import Callable, Iterable, NamedTuple

SEED_HEX = "6ba910032e277de76e2a491e5f450166"
SEED = int(SEED_HEX, 16)
W = H = 5
CELLS = W * H
PULSES = 16
GOALS = (1, 2, 3)
START_X = (0, 1, 3, 4)
START_AMBER = sum(1 << (20 + x) for x in START_X)
START_INDIGO = sum(1 << x for x in START_X)
ORTHOGONAL = ((1, 0), (-1, 0), (0, 1), (0, -1))
DIAGONAL = ((1, 1), (1, -1), (-1, 1), (-1, -1))
AXES = ((1, 0), (0, 1), (1, 1), (1, -1))


class Move(NamedTuple):
    source: int
    target: int  # 0..24 for board; 25+goal_x for a refuge


class State(NamedTuple):
    amber: int
    indigo: int
    migrated_amber: int
    migrated_indigo: int
    beat: int


@dataclass(slots=True)
class LegMetrics:
    score_amber: int
    score_indigo: int
    winner: int
    branches: list[int]
    pin_observations: int
    passes: int


# Precompute movement rays.
RAYS: list[list[list[tuple[int, ...]]]] = [[[] for _ in range(CELLS)] for _ in range(2)]
for mode, directions in enumerate((ORTHOGONAL, DIAGONAL)):
    for cell in range(CELLS):
        x, y = cell % W, cell // W
        for dx, dy in directions:
            ray: list[int] = []
            px, py = x + dx, y + dy
            while 0 <= px < W and 0 <= py < H:
                ray.append(py * W + px)
                px += dx
                py += dy
            RAYS[mode][cell].append(tuple(ray))

# Precompute opposite rays for line-of-sight anchoring.
AXIS_RAYS: list[list[tuple[tuple[int, ...], tuple[int, ...]]]] = [[] for _ in range(CELLS)]
for cell in range(CELLS):
    x, y = cell % W, cell // W
    for dx, dy in AXES:
        pair: list[tuple[int, ...]] = []
        for sign in (1, -1):
            ray: list[int] = []
            px, py = x + dx * sign, y + dy * sign
            while 0 <= px < W and 0 <= py < H:
                ray.append(py * W + px)
                px += dx * sign
                py += dy * sign
            pair.append(tuple(ray))
        AXIS_RAYS[cell].append((pair[0], pair[1]))

# Precompute legal geometric paths from the spawning shelves to off-board refuges.
SCORE_PATHS: list[list[list[list[tuple[int, int]]]]] = [
    [[[] for _ in range(CELLS)] for _ in range(2)] for _ in range(2)
]
for side in (0, 1):
    goal_y = -1 if side == 0 else H
    for mode in (0, 1):
        for cell in range(CELLS):
            x, y = cell % W, cell // W
            in_shelf = y <= 1 if side == 0 else y >= H - 2
            if not in_shelf:
                continue
            for goal_x in GOALS:
                dx, dy = goal_x - x, goal_y - y
                fits = (dx == 0 and dy != 0) if mode == 0 else (abs(dx) == abs(dy) and dy != 0)
                if not fits:
                    continue
                step_x = 0 if dx == 0 else (1 if dx > 0 else -1)
                step_y = 1 if dy > 0 else -1
                px, py = x + step_x, y + step_y
                mask = 0
                valid = True
                while (px, py) != (goal_x, goal_y):
                    if not (0 <= px < W and 0 <= py < H):
                        valid = False
                        break
                    mask |= 1 << (py * W + px)
                    px += step_x
                    py += step_y
                if valid:
                    SCORE_PATHS[side][mode][cell].append((goal_x, mask))


def bits(bitboard: int) -> Iterable[int]:
    while bitboard:
        bit = bitboard & -bitboard
        yield bit.bit_length() - 1
        bitboard -= bit


def side_at(beat: int) -> int:
    """Thue–Morse: parity of the number of 1 bits in beat."""
    return beat.bit_count() & 1


def mode_at(beat: int) -> int:
    """0 = orthogonal surface; 1 = diagonal silt. Pattern 00 11 repeated."""
    return (beat // 2) & 1


def first_piece(ray: tuple[int, ...], occupied: int) -> int:
    for cell in ray:
        if occupied & (1 << cell):
            return cell
    return -1


def anchored(cell: int, opponent: int, occupied: int) -> bool:
    for ray_a, ray_b in AXIS_RAYS[cell]:
        a = first_piece(ray_a, occupied)
        b = first_piece(ray_b, occupied)
        if a >= 0 and b >= 0 and (opponent & (1 << a)) and (opponent & (1 << b)):
            return True
    return False


def legal_moves(state: State) -> tuple[int, list[Move]]:
    if state.beat >= PULSES:
        return -1, []
    side = side_at(state.beat)
    mode = mode_at(state.beat)
    own, opponent = (state.amber, state.indigo) if side == 0 else (state.indigo, state.amber)
    occupied = own | opponent
    moves: list[Move] = []
    for source in bits(own):
        if anchored(source, opponent, occupied):
            continue
        for ray in RAYS[mode][source]:
            for target in ray:
                if occupied & (1 << target):
                    break
                moves.append(Move(source, target))
        for goal_x, path_mask in SCORE_PATHS[side][mode][source]:
            if not occupied & path_mask:
                moves.append(Move(source, 25 + goal_x))
    return side, moves


def apply_move(state: State, side: int, move: Move) -> State:
    amber, indigo, migrated_amber, migrated_indigo, beat = state
    source, target = move
    if side == 0:
        amber ^= 1 << source
        if target >= 25:
            migrated_amber += 1
        else:
            amber |= 1 << target
    else:
        indigo ^= 1 << source
        if target >= 25:
            migrated_indigo += 1
        else:
            indigo |= 1 << target
    return State(amber, indigo, migrated_amber, migrated_indigo, beat + 1)


def pass_pulse(state: State) -> State:
    return State(state.amber, state.indigo, state.migrated_amber, state.migrated_indigo, state.beat + 1)


def progress(state: State, side: int) -> int:
    if side == 0:
        return 5 * state.migrated_amber + sum(4 - cell // 5 for cell in bits(state.amber))
    return 5 * state.migrated_indigo + sum(cell // 5 for cell in bits(state.indigo))


def count_pins(state: State, side: int) -> int:
    own, opponent = (state.amber, state.indigo) if side == 0 else (state.indigo, state.amber)
    occupied = own | opponent
    return sum(anchored(cell, opponent, occupied) for cell in bits(own))


def initial_state() -> State:
    return State(START_AMBER, START_INDIGO, 0, 0, 0)


def random_leg(rng: random.Random) -> LegMetrics:
    state = initial_state()
    branches: list[int] = []
    pin_observations = 0
    passes = 0
    while state.beat < PULSES:
        pin_observations += count_pins(state, 0) + count_pins(state, 1)
        side, moves = legal_moves(state)
        if not moves:
            state = pass_pulse(state)
            passes += 1
            continue
        branches.append(len(moves))
        state = apply_move(state, side, rng.choice(moves))
    amber, indigo = progress(state, 0), progress(state, 1)
    winner = 0 if amber > indigo else 1 if indigo > amber else -1
    return LegMetrics(amber, indigo, winner, branches, pin_observations, passes)


def wilson_interval(successes: int, trials: int, z: float = 1.96) -> tuple[float, float]:
    if trials == 0:
        return math.nan, math.nan
    p = successes / trials
    denominator = 1 + z * z / trials
    center = (p + z * z / (2 * trials)) / denominator
    half = z * math.sqrt((p * (1 - p) + z * z / (4 * trials)) / trials) / denominator
    return center - half, center + half


def sequence_audit() -> dict[str, object]:
    sequence = [side_at(i) for i in range(PULSES)]
    positions = {side: [i for i, value in enumerate(sequence) if value == side] for side in (0, 1)}
    moments = {
        side: [sum(i**degree for i in positions[side]) for degree in range(5)]
        for side in (0, 1)
    }
    mode_counts = {
        side: [sum(sequence[i] == side and mode_at(i) == mode for i in range(PULSES)) for mode in (0, 1)]
        for side in (0, 1)
    }
    for degree in range(4):
        assert moments[0][degree] == moments[1][degree]
    assert mode_counts[0] == mode_counts[1] == [4, 4]
    return {
        "sequence": "".join("A" if value == 0 else "B" for value in sequence),
        "positions": {"A": positions[0], "B": positions[1]},
        "moments_degree_0_to_4": {"A": moments[0], "B": moments[1]},
        "equal_through_degree": 3,
        "surface_silt_counts": {"A": mode_counts[0], "B": mode_counts[1]},
    }


def occupancy_upper_bound() -> int:
    """All non-overlapping placements of 0..4 indistinguishable pieces per side.

    This deliberately ignores reachability and anchoring, so it is an upper bound,
    not a claimed solved state-space size.
    """
    total = 0
    for amber_on_board in range(5):
        for indigo_on_board in range(5):
            total += math.comb(25, amber_on_board) * math.comb(25 - amber_on_board, indigo_on_board)
    return total


def monte_carlo_legs(n: int) -> dict[str, object]:
    rng = random.Random(SEED)
    wins: Counter[int] = Counter()
    branches: list[int] = []
    pins: list[int] = []
    passes: list[int] = []
    margins: list[int] = []
    scores: list[tuple[int, int]] = []
    started = time.perf_counter()
    for _ in range(n):
        leg = random_leg(rng)
        wins[leg.winner] += 1
        branches.extend(leg.branches)
        pins.append(leg.pin_observations)
        passes.append(leg.passes)
        margins.append(abs(leg.score_amber - leg.score_indigo))
        scores.append((leg.score_amber, leg.score_indigo))
    decisive = wins[0] + wins[1]
    return {
        "n": n,
        "amber_wins": wins[0],
        "indigo_wins": wins[1],
        "draws": wins[-1],
        "amber_share_of_decisive": wins[0] / decisive if decisive else None,
        "amber_wilson_95": wilson_interval(wins[0], decisive),
        "mean_branching": statistics.mean(branches),
        "median_branching": statistics.median(branches),
        "mean_pin_observations": statistics.mean(pins),
        "mean_passes": statistics.mean(passes),
        "mean_absolute_margin": statistics.mean(margins),
        "mean_scores": [statistics.mean(a for a, _ in scores), statistics.mean(b for _, b in scores)],
        "seconds": time.perf_counter() - started,
    }


def monte_carlo_matches(n: int) -> dict[str, object]:
    """Two-leg seasons. Identity X is A then B; identity Y is B then A."""
    rng = random.Random(SEED ^ 0xA5A5A5A5)
    wins: Counter[int] = Counter()
    branches: list[int] = []
    pins: list[int] = []
    passes: list[int] = []
    margins: list[int] = []
    totals: list[tuple[int, int]] = []
    leg_margins: list[tuple[int, int]] = []
    started = time.perf_counter()

    for _ in range(n):
        first = random_leg(rng)
        second = random_leg(rng)
        # X: Amber on leg 1, Indigo on leg 2. Y receives the complement.
        score_x = first.score_amber + second.score_indigo
        score_y = first.score_indigo + second.score_amber
        winner = 0 if score_x > score_y else 1 if score_y > score_x else -1
        wins[winner] += 1
        branches.extend(first.branches)
        branches.extend(second.branches)
        pins.append(first.pin_observations + second.pin_observations)
        passes.append(first.passes + second.passes)
        margins.append(abs(score_x - score_y))
        totals.append((score_x, score_y))
        leg_margins.append((first.score_amber - first.score_indigo, second.score_indigo - second.score_amber))

    decisive = wins[0] + wins[1]
    probabilities = [wins[key] / n for key in (0, 1, -1)]
    outcome_entropy = -sum(p * math.log2(p) for p in probabilities if p)
    x_margins = [x for x, _ in leg_margins]
    y_margins = [y for _, y in leg_margins]
    mean_x, mean_y = statistics.mean(x_margins), statistics.mean(y_margins)
    covariance = sum((x - mean_x) * (y - mean_y) for x, y in leg_margins) / n
    correlation = covariance / (statistics.pstdev(x_margins) * statistics.pstdev(y_margins))

    return {
        "n": n,
        "identity_x_wins": wins[0],
        "identity_y_wins": wins[1],
        "draws": wins[-1],
        "identity_x_share_of_decisive": wins[0] / decisive if decisive else None,
        "identity_x_wilson_95": wilson_interval(wins[0], decisive),
        "mean_total_x": statistics.mean(x for x, _ in totals),
        "mean_total_y": statistics.mean(y for _, y in totals),
        "mean_branching": statistics.mean(branches),
        "median_branching": statistics.median(branches),
        "branching_p10_p90": [statistics.quantiles(branches, n=10)[0], statistics.quantiles(branches, n=10)[8]],
        "mean_pin_observations": statistics.mean(pins),
        "mean_passes": statistics.mean(passes),
        "mean_absolute_margin": statistics.mean(margins),
        "outcome_entropy_bits": outcome_entropy,
        "leg_margin_correlation": correlation,
        "seconds": time.perf_counter() - started,
    }


# --- Skill-sensitivity probes -------------------------------------------------
Agent = Callable[[State, list[Move], random.Random], Move]


def random_agent(state: State, moves: list[Move], rng: random.Random) -> Move:
    return rng.choice(moves)


def greedy_agent(state: State, moves: list[Move], rng: random.Random) -> Move:
    side = side_at(state.beat)
    values = [progress(apply_move(state, side, move), side) for move in moves]
    best = max(values)
    return rng.choice([move for move, value in zip(moves, values) if value == best])


def threat_count(state: State, side: int) -> int:
    own, opponent = (state.amber, state.indigo) if side == 0 else (state.indigo, state.amber)
    occupied = own | opponent
    count = 0
    for cell in bits(own):
        if anchored(cell, opponent, occupied):
            continue
        if any(not occupied & mask for mode in (0, 1) for _, mask in SCORE_PATHS[side][mode][cell]):
            count += 1
    return count


def tactical_evaluation(state: State, root: int) -> float:
    other = 1 - root
    distance = progress(state, root) - progress(state, other)
    pressure = count_pins(state, other) - count_pins(state, root)
    threats = threat_count(state, root) - threat_count(state, other)
    urgency = 1 + 0.035 * state.beat
    return 15 * urgency * distance + 2 * pressure + 9 * threats


def tactical_agent(state: State, moves: list[Move], rng: random.Random) -> Move:
    side = side_at(state.beat)
    values = [tactical_evaluation(apply_move(state, side, move), side) for move in moves]
    best = max(values)
    return rng.choice([move for move, value in zip(moves, values) if value == best])


def agent_leg(rng: random.Random, amber_agent: Agent, indigo_agent: Agent) -> tuple[int, int]:
    state = initial_state()
    while state.beat < PULSES:
        side, moves = legal_moves(state)
        if not moves:
            state = pass_pulse(state)
            continue
        agent = amber_agent if side == 0 else indigo_agent
        state = apply_move(state, side, agent(state, moves, rng))
    return progress(state, 0), progress(state, 1)


def agent_match(rng: random.Random, agent_x: Agent, agent_y: Agent) -> tuple[int, int]:
    first_x, first_y = agent_leg(rng, agent_x, agent_y)
    second_y, second_x = agent_leg(rng, agent_y, agent_x)
    return first_x + second_x, first_y + second_y


def skill_probe(n: int) -> dict[str, object]:
    pairings = [
        ("greedy_vs_random", greedy_agent, random_agent, SEED ^ 0x515151),
        ("tactical_vs_greedy", tactical_agent, greedy_agent, SEED ^ 0x717171),
    ]
    report: dict[str, object] = {}
    for name, agent_x, agent_y, seed in pairings:
        rng = random.Random(seed)
        wins: Counter[str] = Counter()
        margins: list[int] = []
        scores: list[tuple[int, int]] = []
        started = time.perf_counter()
        for _ in range(n):
            x, y = agent_match(rng, agent_x, agent_y)
            wins["x" if x > y else "y" if y > x else "draw"] += 1
            margins.append(x - y)
            scores.append((x, y))
        decisive = wins["x"] + wins["y"]
        report[name] = {
            "n": n,
            "x_wins": wins["x"],
            "y_wins": wins["y"],
            "draws": wins["draw"],
            "x_share_of_decisive": wins["x"] / decisive if decisive else None,
            "mean_signed_margin": statistics.mean(margins),
            "mean_scores": [statistics.mean(x for x, _ in scores), statistics.mean(y for _, y in scores)],
            "seconds": time.perf_counter() - started,
        }
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--legs", type=int, default=5_000, help="random single legs (default: 5000)")
    parser.add_argument("--matches", type=int, default=5_000, help="random paired seasons (default: 5000)")
    parser.add_argument("--skill", type=int, default=300, help="paired matches per skill probe (default: 300)")
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = parser.parse_args()

    report = {
        "seed": SEED_HEX,
        "sequence_audit": sequence_audit(),
        "occupancy_upper_bound": occupancy_upper_bound(),
        "active_position_upper_bound_two_legs": occupancy_upper_bound() * PULSES * 2,
        "random_single_legs": monte_carlo_legs(args.legs) if args.legs else None,
        "random_paired_seasons": monte_carlo_matches(args.matches) if args.matches else None,
        "skill_sensitivity": skill_probe(args.skill) if args.skill else None,
    }

    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print(f"POTAMORSE audit — seed {SEED_HEX}")
        print(json.dumps(report["sequence_audit"], indent=2))
        print(f"Placement upper bound: {report['occupancy_upper_bound']:,}")
        if report["random_single_legs"]:
            print("\nRandom single legs")
            print(json.dumps(report["random_single_legs"], indent=2))
        if report["random_paired_seasons"]:
            print("\nRandom paired seasons")
            print(json.dumps(report["random_paired_seasons"], indent=2))
        if report["skill_sensitivity"]:
            print("\nSkill sensitivity")
            print(json.dumps(report["skill_sensitivity"], indent=2))


if __name__ == "__main__":
    main()