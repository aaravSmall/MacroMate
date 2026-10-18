import type { ChainConfig } from '../lib/normalize';
import { chipotle } from './chipotle';
import { fiveguys } from './fiveguys';
import { wingstop } from './wingstop';

/** Add a chain: write chains/<id>.ts and list it here. */
export const CHAINS: Record<string, ChainConfig> = { wingstop, chipotle, fiveguys };
