// build_dna.js
import fs from 'fs'
import plist from 'plist'

const CTY_FILE = './cty.dat'
const ISO_FILE = './dxcc.json'
const OUTPUT_FILE = './cty_dna.js'
const PLIST_FILE = './cty.plist'


// ADIF entity list 
const plistRaw = fs.readFileSync(PLIST_FILE, 'utf8')
const ctyData = plist.parse(plistRaw)
const prefixObject = new Object()

Object.entries(ctyData).forEach(([prefixKey, entry]) => {
    if (entry.ADIF) prefixObject[entry.Prefix] = entry.ADIF
})


const getUniqueTuples = (arr) => {
    // 1. Map to JSON strings to make them comparable values
    // 2. Pass to Set to remove duplicates
    // 3. Map back to Objects/Arrays
    return [...new Set(arr.map(JSON.stringify))].map(JSON.parse)
}

function build() {
    console.log("Reading local files...")


    const isoData = JSON.parse(fs.readFileSync(ISO_FILE, 'utf8'))

    const pool = []
    const poolMap = new Map()
    const trie = {}

    // Helper to deduplicate data objects
    const getPoolIndex = (data) => {
        const key = `${data.iso}|${data.cq}|${data.itu}|${data.entity}`
        if (poolMap.has(key)) return poolMap.get(key)
        const index = pool.length
        pool.push(data)
        poolMap.set(key, index)
        return index
    }

    // imports a cty file
    const importCty = (rawData) => {
        const blocks = rawData.split(';')

        blocks.forEach(block => {
            const lines = block.trim().split('\n').map(l => l.trim())
            if (lines.length < 2) return

            const header = lines[0].split(':')
            const entityName = header[0].trim()
            const primaryPrefix = header[7].trim()

            const entityId = prefixObject[primaryPrefix.replace(/^=/, '')]
            const isoMatch = isoData.dxcc.find(i => {
                let isValid = true
                if (i.validEnd) {
                    const end = new Date(i.validEnd)
                    const today = new Date()
                    if (end < today) {
                        isValid = false
                    }
                }
                return isValid && i.entityCode === entityId
            })

            const isoCode = isoMatch && isoMatch.countryCode !== 'ZZ' ? isoMatch.countryCode : '??'
            const baseInfo = {
                entity: entityName,
                entity_id: entityId ? entityId : 0,
                prefix: primaryPrefix || '',
                country: isoCode,
                flag: isoMatch ? isoMatch.flag : '',
                cq: parseInt(header[1]),
                itu: parseInt(header[2]),
                cont: header[3].trim(),
                long: parseFloat(header[5]),
                lat: parseFloat(header[4]),
                utc: parseInt(header[6]),

            }

            const prefixLine = lines.slice(1).join('')
            const prefixItems = prefixLine.split(',')

            prefixItems.forEach(item => {
                if (!item) return
                let raw = item.trim()

                // Extract Zone overrides: (CQ) and [ITU]
                const cqMatch = raw.match(/\((\d+)\)/)
                const ituMatch = raw.match(/\[(\d+)\]/)

                // Clean prefix and detect exact match (=)
                let clean = raw.replace(/\(\d+\)|\[\d+\]|<[^>]+>|{[^}]+}|~\d+~/g, '')
                const isExact = clean.startsWith('=')
                const prefix = isExact ? clean.substring(1) : clean

                const currentInfo = { ...baseInfo }
                if (cqMatch) currentInfo.cq = parseInt(cqMatch[1])
                if (ituMatch) currentInfo.itu = parseInt(ituMatch[1])

                const valIdx = getPoolIndex(currentInfo)

                // Insert into Trie
                let node = trie
                // Exact matches are stored in a separate branch starting with '='
                const path = isExact ? `=${prefix}` : prefix

                for (const char of path) {
                    if (!node[char]) node[char] = {}
                    node = node[char]
                }
                if (currentInfo.prefix.startsWith('*')) {
                    node.c = valIdx
                } else {
                    node.v = valIdx

                }
            })
        })
    }
    const ctyRaw = fs.readFileSync(CTY_FILE, 'utf8')
    importCty(ctyRaw)

    const output = `// Auto-generated Amateur Radio Lookup DNA\nexport const pool = ${JSON.stringify(pool)};\nexport const trie = ${JSON.stringify(trie)};`
    fs.writeFileSync(OUTPUT_FILE, output)
    console.log(`Success! DNA built with ${pool.length} unique entities.`)
}

build()