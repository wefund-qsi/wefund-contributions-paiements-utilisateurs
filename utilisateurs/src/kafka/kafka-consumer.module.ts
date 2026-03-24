import { Module } from '@nestjs/common';
import { CampaignEventsConsumer } from './campaign-events.consumer';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [CampaignEventsConsumer],
})
export class KafkaConsumerModule {}
