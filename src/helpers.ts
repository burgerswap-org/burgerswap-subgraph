import { Address, BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { ERC20 } from '../generated/DemaxFactory/ERC20'

import { DemaxFactory as FactoryContract } from '../generated/DemaxFactory/DemaxFactory'
import { MapEntity, PairEntity, TokenEntity } from '../generated/schema'

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export const FACTORY_ADDRESS = '0xa4790135Ba4439cdb2eFB35fe191dC83d3D627F6'
export const BURGER_ADDRESS = '0xAe9269f27437f0fcBC232d39Ec814844a51d6b8f'
export const BURGER_ADDRESS_LOWER_CASE =
    '0xae9269f27437f0fcbc232d39ec814844a51d6b8f'
export const WBNB_ADDRESS_LOWER_CASE =
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'

export let ZERO_BI = BigInt.fromI32(0)
export let ONE_BI = BigInt.fromI32(1)
export let ZERO_BD = BigDecimal.fromString('0')
export let ONE_BD = BigDecimal.fromString('1')
export let BI_18 = BigInt.fromI32(18)

export let factoryContract = FactoryContract.bind(
    Address.fromString(FACTORY_ADDRESS)
)

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
    let bd = BigDecimal.fromString('1')
    for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
        bd = bd.times(BigDecimal.fromString('10'))
    }
    return bd
}

export function bigDecimalExp18(): BigDecimal {
    return BigDecimal.fromString('1000000000000000000')
}

export function convertEthToDecimal(eth: BigInt): BigDecimal {
    return eth.toBigDecimal().div(exponentToBigDecimal(18))
}

export function convertTokenToDecimal(
    tokenAmount: BigInt,
    exchangeDecimals: BigInt
): BigDecimal {
    if (exchangeDecimals == ZERO_BI) {
        return tokenAmount.toBigDecimal()
    }
    return tokenAmount
        .toBigDecimal()
        .div(exponentToBigDecimal(exchangeDecimals))
}

export function equalToZero(value: BigDecimal): boolean {
    const formattedVal = parseFloat(value.toString())
    const zero = parseFloat(ZERO_BD.toString())
    if (zero == formattedVal) {
        return true
    }
    return false
}

export function isNullEthValue(value: string): boolean {
    return (
        value ==
        '0x0000000000000000000000000000000000000000000000000000000000000001'
    )
}

export function fetchTokenSymbol(tokenAddress: Address): string {
    // hard coded override
    if (
        tokenAddress.toHexString() ==
        '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a'
    ) {
        return 'DGD'
    }

    let contract = ERC20.bind(tokenAddress)

    // try types string and bytes32 for symbol
    let symbolValue = 'unknown'
    let symbolResult = contract.try_symbol()
    if (symbolResult.reverted) {
        let symbolResultBytes = contract.try_symbol()
        if (!symbolResultBytes.reverted) {
            // for broken pairs that have no symbol function exposed
            if (!isNullEthValue(symbolResultBytes.value)) {
                symbolValue = symbolResultBytes.value.toString()
            }
        }
    } else {
        symbolValue = symbolResult.value
    }

    return symbolValue
}

export function fetchTokenName(tokenAddress: Address): string {
    // hard coded override
    if (
        tokenAddress.toHexString() ==
        '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a'
    ) {
        return 'DGD'
    }

    let contract = ERC20.bind(tokenAddress)

    // try types string and bytes32 for name
    let nameValue = 'unknown'
    let nameResult = contract.try_name()
    if (nameResult.reverted) {
        let nameResultBytes = contract.try_name()
        if (!nameResultBytes.reverted) {
            // for broken exchanges that have no name function exposed
            if (!isNullEthValue(nameResultBytes.value)) {
                nameValue = nameResultBytes.value.toString()
            }
        }
    } else {
        nameValue = nameResult.value
    }

    return nameValue
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
    let contract = ERC20.bind(tokenAddress)
    let totalSupplyValue = null
    let totalSupplyResult = contract.try_totalSupply()
    if (!totalSupplyResult.reverted) {
        totalSupplyValue = totalSupplyResult as i32
    }
    return BigInt.fromI32(totalSupplyValue as i32)
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
    let contract = ERC20.bind(tokenAddress)
    // try types uint8 for decimals
    let decimalValue = null
    let decimalResult = contract.try_decimals()
    if (!decimalResult.reverted) {
        decimalValue = decimalResult.value
    }
    return BigInt.fromI32(decimalValue as i32)
}

export function calcTokenValue(token: TokenEntity, amount: BigInt): BigDecimal {
    if (amount.equals(ZERO_BI)) return ZERO_BD

    let corePairMap = MapEntity.load(WBNB_ADDRESS_LOWER_CASE)
    if (corePairMap.pairAddress == null) return ZERO_BD
    let corePair = PairEntity.load(corePairMap.pairAddress.toHex())
    let bnbReserve = ZERO_BD
    let burgerReserve = ZERO_BD
    if (corePair.token0 == WBNB_ADDRESS_LOWER_CASE) {
        bnbReserve = corePair.reserve0
        burgerReserve = corePair.reserve1
    } else {
        bnbReserve = corePair.reserve1
        burgerReserve = corePair.reserve0
    }
    if (token.id == BURGER_ADDRESS_LOWER_CASE) {
        return convertTokenToDecimal(amount, token.decimals)
            .times(bnbReserve)
            .div(burgerReserve)
    }
    let tokenPairAddress = MapEntity.load(token.id)
    if (tokenPairAddress.pairAddress == null) return ZERO_BD
    let pairInfo = PairEntity.load(tokenPairAddress.pairAddress.toHex())
    let tokenA = TokenEntity.load(pairInfo.token0)
    if (tokenA.id === BURGER_ADDRESS_LOWER_CASE) {
        if (pairInfo.reserve1.equals(ZERO_BD)) return ZERO_BD
        return amount
            .toBigDecimal()
            .times(pairInfo.reserve0)
            .div(pairInfo.reserve1)
            .div(exponentToBigDecimal(BigInt.fromI32(18)))
            .times(bnbReserve)
            .div(burgerReserve)
    }
    if (pairInfo.reserve0.equals(ZERO_BD)) return ZERO_BD
    return amount
        .toBigDecimal()
        .times(pairInfo.reserve1)
        .div(pairInfo.reserve0)
        .div(exponentToBigDecimal(BigInt.fromI32(18)))
        .times(bnbReserve)
        .div(burgerReserve)
}
