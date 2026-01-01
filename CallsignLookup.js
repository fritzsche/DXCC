// CallsignLookup.js
import { pool, trie } from './cty_dna.js'

export class CallsignLookup {
    /**
     * Resolves a callsign to its DXCC entity and zones.
     * @param {string} callsign 
     */
    static mode_cqww = 'CQ'
    static mode_arrl = 'ARRL'
    find(callsign, mode = CallsignLookup.mode_cqww) {
        if (!callsign) return null
        const cs = callsign.toUpperCase()

        // 1. Check for Exact Match (=CALL)
        /*
        if (cs === '4U1VIC') {
            debugger;
        }*/
        const exact = this._walk(`=${cs}`, mode)
        if (exact) return exact

        // 2. Longest Prefix Match
        // Handle common portable notation (e.g., P4/N1MM or N1MM/P)
        const parts = cs.split('/')
        let searchStr = parts[0]

        // If the first part is a short prefix (e.g. VE3/G3YPP), use it.
        if (parts.length > 1 && parts[0].length <= 3) {
            searchStr = parts[0]
        }

        return this._walk(searchStr, mode)
    }

    _walk(str, mode = CallsignLookup.mode_cqww) {
        let node = trie
        let lastResult = null

        for (const char of str) {
            if (node[char]) {
                node = node[char]

                // Update lastResult if this node is a terminal value
                if (node.v !== undefined) {
                    lastResult = pool[node.v]                    
                }
                if (mode === CallsignLookup.mode_cqww && node.c !== undefined) {
                    lastResult = pool[node.c]
                }
            } else {
                break // No further match possible
            }
        }
        // for non ARRL entity we derive 
        if (mode === CallsignLookup.mode_cqww && lastResult && lastResult.prefix.startsWith('*')) {
            let arrl_entity = this.find(str.replace(/^=/, ""), CallsignLookup.mode_arrl)

            if (arrl_entity && arrl_entity.country)
                lastResult.country = arrl_entity.country
        }
        if(lastResult) lastResult.prefix = lastResult.prefix.replace(/^\*/,"")
        return lastResult
    }
}