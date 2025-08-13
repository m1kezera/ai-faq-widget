import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DocsModule } from './docs/docs.module';
import { AskModule } from './ask/ask.module';
import { LeadsModule } from './leads/leads.module';
import { SitesModule } from './sites/sites.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI!, {
      dbName: process.env.DB_NAME,
    }),
    DocsModule,
    AskModule,
    LeadsModule,
    SitesModule,
  ],
})
export class AppModule {}
