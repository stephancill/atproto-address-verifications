/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  OrgChainagnosticVerification: {
    lexicon: 1,
    id: 'org.chainagnostic.verification',
    defs: {
      main: {
        type: 'record',
        description:
          'A claim linking an atproto account to an external blockchain address via EIP-712 signature.',
        key: 'any',
        record: {
          type: 'object',
          required: ['address', 'signature', 'blockHash', 'createdAt'],
          properties: {
            address: {
              type: 'bytes',
              description: 'The ERC-7930 interoperable address binary format.',
              maxLength: 128,
            },
            signature: {
              type: 'bytes',
              description: 'The EIP-712 signature of the verification claim.',
            },
            blockHash: {
              type: 'bytes',
              description: 'The block hash used as part of the signed claim.',
              maxLength: 32,
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  OrgChainagnosticVerification: 'org.chainagnostic.verification',
} as const
