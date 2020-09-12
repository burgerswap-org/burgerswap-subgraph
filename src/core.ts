import {
    DemaxFactoryEntity,
    PairEntity,
    TokenEntity
} from '../generated/schema'
import {
    Burn1 as Burn,
    Mint1 as Mint,
    Swap
} from '../generated/templates/DemaxPairTemplate/DemaxPair'
import {
    calcTokenValue,
    convertTokenToDecimal,
    FACTORY_ADDRESS,
    ONE_BI
} from './helpers'
import { updateDayData } from './dayUpdate'

export function handleMint(event: Mint): void {
    //log.info(`--handleMint` + event.address.toHex() + '--', [])
    let pair = PairEntity.load(event.address.toHex())
    let factoryEntity = DemaxFactoryEntity.load(FACTORY_ADDRESS)
    //
    let token0 = TokenEntity.load(pair.token0)
    let token1 = TokenEntity.load(pair.token1)
    let token0Amount = convertTokenToDecimal(
        event.params.amount0,
        token0.decimals
    )
    let token1Amount = convertTokenToDecimal(
        event.params.amount1,
        token1.decimals
    )
    //// update txn counts
    token0.txCount = token0.txCount.plus(ONE_BI)
    token1.txCount = token1.txCount.plus(ONE_BI)
    //
    //// update txn counts
    pair.txCount = pair.txCount.plus(ONE_BI)
    pair.reserve0 = pair.reserve0.plus(token0Amount)
    pair.reserve1 = pair.reserve1.plus(token1Amount)
    factoryEntity.txCount = factoryEntity.txCount.plus(ONE_BI)
    factoryEntity.LPValue = factoryEntity.LPValue.plus(
        calcTokenValue(token0 as TokenEntity, event.params.amount0)
    )
    factoryEntity.LPValue = factoryEntity.LPValue.plus(
        calcTokenValue(token1 as TokenEntity, event.params.amount1)
    )
    //// save entities
    token0.save()
    token1.save()
    pair.save()
    factoryEntity.save()
    updateDayData(event)
}

export function handleSwap(event: Swap): void {
    let factory = DemaxFactoryEntity.load(FACTORY_ADDRESS)

    let pair = PairEntity.load(event.address.toHex())
    let token0 = TokenEntity.load(pair.token0)
    let token1 = TokenEntity.load(pair.token1)

    pair.reserve0 = pair.reserve0.minus(
        convertTokenToDecimal(event.params.amount0Out, token0.decimals)
    )
    pair.reserve1 = pair.reserve1.minus(
        convertTokenToDecimal(event.params.amount1Out, token1.decimals)
    )
    pair.reserve0 = pair.reserve0.plus(
        convertTokenToDecimal(event.params.amount0In, token0.decimals)
    )
    pair.reserve1 = pair.reserve1.plus(
        convertTokenToDecimal(event.params.amount1In, token1.decimals)
    )
    let txBurgerValue = calcTokenValue(
        token0 as TokenEntity,
        event.params.amount0In
    ).plus(calcTokenValue(token1 as TokenEntity, event.params.amount1In))
    pair.txBurgerValue = pair.txBurgerValue.plus(txBurgerValue)
    pair.save()
    factory.txCount = factory.txCount.plus(ONE_BI)
    factory.tradeValue = factory.tradeValue.plus(txBurgerValue)
    factory.save()
    updateDayData(event)
}

export function handleBurn(event: Burn): void {
    let factory = DemaxFactoryEntity.load(FACTORY_ADDRESS)
    let pair = PairEntity.load(event.address.toHex())
    let token0 = TokenEntity.load(pair.token0)
    let token1 = TokenEntity.load(pair.token1)
    pair.reserve0 = pair.reserve0.minus(
        convertTokenToDecimal(event.params.amount0, token0.decimals)
    )
    pair.reserve1 = pair.reserve1.minus(
        convertTokenToDecimal(event.params.amount1, token1.decimals)
    )
    let txBurgerValue = calcTokenValue(
        token0 as TokenEntity,
        event.params.amount0
    ).plus(calcTokenValue(token1 as TokenEntity, event.params.amount1))
    pair.txBurgerValue = pair.txBurgerValue.plus(txBurgerValue)
    pair.txCount = pair.txCount.plus(ONE_BI)
    pair.save()
    factory.txCount = factory.txCount.plus(ONE_BI)
    factory.LPValue = factory.LPValue.minus(txBurgerValue)
    factory.save()
    updateDayData(event)
}
