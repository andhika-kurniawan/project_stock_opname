import type { 
  User, 
  Category, 
  Product, 
  SOSession, 
  SOItem, 
  SessionWithRelations, 
  SOItemWithRelations,
  CreateSessionDTO
} from '../../../types'

export type { 
  User, 
  Category, 
  Product, 
  SOSession, 
  SOItem, 
  SessionWithRelations, 
  SOItemWithRelations,
  CreateSessionDTO
}

export type RootStackParamList = {
  Login: undefined
  Home: undefined
  SessionDetail: { sessionId: string }
  Scanner: { sessionId: string; categoryName?: string }
  Review: { sessionId: string }
}
