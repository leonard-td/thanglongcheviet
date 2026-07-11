import { Module } from "@medusajs/framework/utils"
import NavigationModuleService from "./service"

export const NAVIGATION_MODULE = "navigationModuleService"

export default Module(NAVIGATION_MODULE, {
  service: NavigationModuleService,
})
