import CareChannelModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const CARE_CHANNEL_MODULE = "care_channel"

export default Module(CARE_CHANNEL_MODULE, {
  service: CareChannelModuleService,
})
