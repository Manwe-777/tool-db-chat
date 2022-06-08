/* tslint:disable */
/* eslint-disable */
/**
* @param {string} sig
* @param {string} msg
* @returns {string}
*/
export function eth_recover(sig: string, msg: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly eth_recover: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly rustsecp256k1_v0_4_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_4_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_4_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_4_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_free: (a: number, b: number) => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
