import AskModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ASK_MODULE = "ask"

export default Module(ASK_MODULE, {
  service: AskModuleService,
})
