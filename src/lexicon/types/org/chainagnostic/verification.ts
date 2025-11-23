/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../lexicons'
import { type $Typed, is$typed as _is$typed, type OmitKey } from '../../../util'

const is$typed = _is$typed,
  validate = _validate
const id = 'org.chainagnostic.verification'

export interface Main {
  $type: 'org.chainagnostic.verification'
  /** The ERC-7930 interoperable address binary format. */
  address: Uint8Array
  /** The EIP-712 signature of the verification claim. */
  signature: Uint8Array
  /** The block hash used as part of the signed claim. */
  blockHash: Uint8Array
  createdAt: string
  [k: string]: unknown
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true)
}

export {
  type Main as Record,
  isMain as isRecord,
  validateMain as validateRecord,
}
