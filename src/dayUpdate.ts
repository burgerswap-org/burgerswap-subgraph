import { ethereum } from '@graphprotocol/graph-ts'
import { DayData, DemaxFactoryEntity } from '../generated/schema'
import { FACTORY_ADDRESS, ZERO_BD, ZERO_BI } from './helpers'

export function updateDayData(event: ethereum.Event): void {
    let factory = DemaxFactoryEntity.load(FACTORY_ADDRESS)
    let timestamp = event.block.timestamp.toI32()
    let dayID = timestamp / 86400
    let dayStartTimestamp = dayID * 86400
    let data = DayData.load(dayID.toString())
    if (data == null) {
        let data = new DayData(dayID.toString())
        data.volumeBNB = ZERO_BD
        data.date = dayStartTimestamp
        data.txCount = ZERO_BI
        data.volumeBNB = ZERO_BD
        data.save()
    }
    data = DayData.load(dayID.toString())
    data.txCount = factory.txCount
    data.volumeBNB = factory.LPValue
    data.save()
}
