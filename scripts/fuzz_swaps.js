#!/usr/bin/env node
/**
 * Lightweight fuzz harness for whisper_waffle_swap_v3.aleo swap transitions.
 *
 * Randomises swap input amounts around a baseline pool configuration,
 * derives expected/min outputs with the constant product formula and
 * invokes `leo execute ... --yes` to ensure the relaxed tolerance does not
 * trigger assertions.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const TOKEN_ID = process.env.FUZZ_TOKEN_ID || '42field';
const ITERATIONS = parseInt(process.env.FUZZ_ITERATIONS || '25', 10);
const SLIPPAGE_BPS = parseInt(process.env.FUZZ_SLIPPAGE_BPS || '10', 10);
const FEE_BPS = parseInt(process.env.FUZZ_FEE_BPS || '30', 10);

const BASE_RESERVE_ALEO = BigInt(process.env.FUZZ_BASE_ALEO || (50n * 1_000_000n));
const BASE_RESERVE_TOKEN = BigInt(process.env.FUZZ_BASE_TOKEN || (5_000n * 1_000_000n));

const programDir = path.resolve(__dirname, '..', 'program');

function randomWithinPercent(base, percent) {
  const min = Number(base * BigInt(100 - percent)) / 100;
  const max = Number(base * BigInt(100 + percent)) / 100;
  return BigInt(Math.max(1, Math.floor(Math.random() * (max - min + 1) + min)));
}

function getAmountOut(amountIn, reserveIn, reserveOut, feeBps) {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const amountInWithFee = (amountIn * BigInt(10000 - feeBps)) / 10000n;
  if (amountInWithFee === 0n) return 0n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  return numerator / denominator;
}

function computeMinOut(expectedOut, slippageBps) {
  if (expectedOut === 0n) return 0n;
  const multiplier = BigInt(10000 - slippageBps);
  return (expectedOut * multiplier) / 10000n;
}

function formatU128(value) {
  return `${value.toString()}u128`;
}

const results = [];

for (let i = 1; i <= ITERATIONS; i += 1) {
  const reserveAleo = randomWithinPercent(BASE_RESERVE_ALEO, 30);
  const reserveToken = randomWithinPercent(BASE_RESERVE_TOKEN, 30);
  const maxTrade = reserveAleo / 3n;
  const aleoIn = BigInt(Math.max(1, Math.floor(Math.random() * Number(maxTrade) + 1)));

  const expectedOut = getAmountOut(aleoIn, reserveAleo, reserveToken, FEE_BPS);
  if (expectedOut === 0n) {
    results.push({ iteration: i, status: 'skipped', reason: 'zero-expected-out' });
    continue;
  }

  const minOut = computeMinOut(expectedOut, SLIPPAGE_BPS);
  if (minOut === 0n) {
    results.push({ iteration: i, status: 'skipped', reason: 'zero-min-out' });
    continue;
  }

  const cmd = [
    'execute',
    'swap_aleo_for_token',
    TOKEN_ID,
    formatU128(aleoIn),
    formatU128(minOut),
    formatU128(expectedOut),
    '--yes',
  ];

  const env = { ...process.env, LEO_SKIP_PROMPTS: '1' };
  const execResult = spawnSync('leo', cmd, {
    cwd: programDir,
    env,
    encoding: 'utf8',
  });

  results.push({
    iteration: i,
    aleoIn: aleoIn.toString(),
    expectedOut: expectedOut.toString(),
    minOut: minOut.toString(),
    reserves: { aleo: reserveAleo.toString(), token: reserveToken.toString() },
    exitCode: execResult.status,
    stderr: execResult.stderr,
  });

  if (execResult.status !== 0) {
    console.error(`Iteration ${i} failed (exit ${execResult.status}).`);
    break;
  }
}

const failures = results.filter((r) => r.exitCode && r.exitCode !== 0);
const summary = {
  iterationsRequested: ITERATIONS,
  iterationsRun: results.length,
  failures: failures.length,
};

console.log(JSON.stringify({ summary, results }, null, 2));
