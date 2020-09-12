import { Address, log } from '@graphprotocol/graph-ts'
import { PairCreated } from '../generated/DemaxFactory/DemaxFactory'
import {
    BURGER_ADDRESS_LOWER_CASE,
    FACTORY_ADDRESS,
    fetchTokenDecimals,
    fetchTokenName,
    fetchTokenSymbol,
    ZERO_BD,
    ZERO_BI
} from './helpers'
import {
    DemaxFactoryEntity,
    MapEntity,
    PairEntity,
    TokenEntity
} from '../generated/schema'

import { DemaxPairTemplate } from '../generated/templates'

export function handleNewPair(event: PairCreated): void {
    //log.info(`--handleNewPair` + event.params.pair.toHex(), [])
    let factory = DemaxFactoryEntity.load(FACTORY_ADDRESS)
    if (factory == null) {
        factory = new DemaxFactoryEntity(FACTORY_ADDRESS)
        factory.pairCount = 0
        factory.txCount = ZERO_BI
        factory.LPValue = ZERO_BD
        factory.tradeValue = ZERO_BD
    }
    factory.pairCount = factory.pairCount + 1
    factory.save()

    // create the tokens
    let token0 = TokenEntity.load(event.params.token0.toHexString())
    let token1 = TokenEntity.load(event.params.token1.toHexString())

    // fetch info if null
    if (token0 == null) {
        token0 = new TokenEntity(event.params.token0.toHexString())
        token0.symbol = fetchTokenSymbol(event.params.token0)
        token0.name = fetchTokenName(event.params.token0)
        let decimals = fetchTokenDecimals(event.params.token0)
        // bail if we couldn't figure out the decimals
        if (decimals === null) {
            log.debug('mybug the decimal on token 0 was null', [])
            return
        }
        token0.decimals = decimals
        token0.tradeVolume = ZERO_BD
        token0.txCount = ZERO_BI
    }

    // fetch info if null
    if (token1 == null) {
        token1 = new TokenEntity(event.params.token1.toHexString())
        token1.symbol = fetchTokenSymbol(event.params.token1)
        token1.name = fetchTokenName(event.params.token1)
        let decimals = fetchTokenDecimals(event.params.token1)

        // bail if we couldn't figure out the decimals
        if (decimals === null) {
            return
        }
        token1.decimals = decimals
        token1.tradeVolume = ZERO_BD
        token1.txCount = ZERO_BI
    }

    let pair = new PairEntity(event.params.pair.toHexString())
    pair.token0 = token0.id
    pair.token1 = token1.id
    pair.createdAtTimestamp = event.block.timestamp
    pair.createdAtBlockNumber = event.block.number
    pair.txCount = ZERO_BI
    pair.txBurgerValue = ZERO_BD
    pair.reserve0 = ZERO_BD
    pair.reserve1 = ZERO_BD

    DemaxPairTemplate.create(event.params.pair)

    if (token0.id != BURGER_ADDRESS_LOWER_CASE) {
        let map = MapEntity.load(token0.id)
        if (map == null) {
            map = new MapEntity(token0.id)
            map.pairAddress = Address.fromString(event.params.pair.toHex())
            map.save()
        }
    }
    if (token1.id != BURGER_ADDRESS_LOWER_CASE) {
        let map = MapEntity.load(token1.id)
        if (map == null) {
            map = new MapEntity(token1.id)
            map.pairAddress = Address.fromString(event.params.pair.toHex())
            map.save()
        }
    }
    // save updated values
    token0.save()
    token1.save()
    pair.save()
    factory.save()
}
