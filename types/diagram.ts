export interface DiagramItem {
  id: string
  type: 'object' | 'page' | 'info' | 'function' | 'case'
  title: string
  nestingLevel: number
  instanceOf?: string
  linkTo?: string
  children: DiagramItem[]
  columnIndex?: number
}

export interface ParsedData {
  objectMap: DiagramItem[][]
  siteMap: DiagramItem[][]
}

export interface Registry {
  [id: string]: DiagramItem
}
