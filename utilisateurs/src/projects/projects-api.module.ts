import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProjectsApiClient } from './projects-api.client';

@Global()
@Module({
  imports: [HttpModule],
  providers: [ProjectsApiClient],
  exports: [ProjectsApiClient],
})
export class ProjectsApiModule {}
