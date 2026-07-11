import { MedusaService } from "@medusajs/framework/utils"
import { NavigationItem } from "./models/navigation-item"

class NavigationModuleService extends MedusaService({
  NavigationItem,
}) {}

export default NavigationModuleService
