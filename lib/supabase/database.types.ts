
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"changed_columns": (string)[] | null,"id": number,"occurred_at": string,"organization_id": string | null,"record_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"changed_columns"?: (string)[] | null,"id"?: never,"occurred_at"?: string,"organization_id"?: string | null,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"changed_columns"?: (string)[] | null,"id"?: never,"occurred_at"?: string,"organization_id"?: string | null,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"clients": {
                  Row: {
                    "address": string | null,"archived_at": string | null,"created_at": string,"created_by": string | null,"document_number": string | null,"document_type": Database["public"]['Enums']["document_type"] | null,"email": string | null,"full_name": string,"id": string,"kind": Database["public"]['Enums']["client_kind"],"locality": string | null,"notes": string | null,"organization_id": string,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"document_number"?: string | null,"document_type"?: Database["public"]['Enums']["document_type"] | null,"email"?: string | null,"full_name": string,"id"?: string,"kind"?: Database["public"]['Enums']["client_kind"],"locality"?: string | null,"notes"?: string | null,"organization_id": string,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"archived_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"document_number"?: string | null,"document_type"?: Database["public"]['Enums']["document_type"] | null,"email"?: string | null,"full_name"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["client_kind"],"locality"?: string | null,"notes"?: string | null,"organization_id"?: string,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clients_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "created_at": string,"id": string,"matter_id": string,"mime_type": string,"name": string,"size_bytes": number,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"matter_id": string,"mime_type": string,"name": string,"size_bytes": number,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"matter_id"?: string,"mime_type"?: string,"name"?: string,"size_bytes"?: number,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "all_day": boolean,"completed_at": string | null,"created_at": string,"created_by": string | null,"deadline_business_days": number | null,"deadline_from": string | null,"ends_at": string | null,"id": string,"is_peremptory": boolean,"kind": Database["public"]['Enums']["event_kind"],"location": string | null,"matter_id": string | null,"notes": string | null,"organization_id": string,"priority": Database["public"]['Enums']["event_priority"],"starts_at": string,"status": Database["public"]['Enums']["event_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_day"?: boolean,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"deadline_business_days"?: number | null,"deadline_from"?: string | null,"ends_at"?: string | null,"id"?: string,"is_peremptory"?: boolean,"kind"?: Database["public"]['Enums']["event_kind"],"location"?: string | null,"matter_id"?: string | null,"notes"?: string | null,"organization_id": string,"priority"?: Database["public"]['Enums']["event_priority"],"starts_at": string,"status"?: Database["public"]['Enums']["event_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "all_day"?: boolean,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"deadline_business_days"?: number | null,"deadline_from"?: string | null,"ends_at"?: string | null,"id"?: string,"is_peremptory"?: boolean,"kind"?: Database["public"]['Enums']["event_kind"],"location"?: string | null,"matter_id"?: string | null,"notes"?: string | null,"organization_id"?: string,"priority"?: Database["public"]['Enums']["event_priority"],"starts_at"?: string,"status"?: Database["public"]['Enums']["event_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"matter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string,"body": string,"created_at"?: string,"id"?: string,"matter_id": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"matter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_comments_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_entries": {
                  Row: {
                    "created_at": string,"created_by": string | null,"details": string | null,"id": string,"kind": Database["public"]['Enums']["entry_kind"],"matter_id": string,"occurred_on": string,"summary": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"details"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["entry_kind"],"matter_id": string,"occurred_on"?: string,"summary": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"details"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["entry_kind"],"matter_id"?: string,"occurred_on"?: string,"summary"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_entries_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_shares": {
                  Row: {
                    "collaborator_id": string,"created_at": string,"created_by": string | null,"expires_at": string | null,"id": string,"include_documents": boolean,"matter_id": string,"permission": Database["public"]['Enums']["share_permission"],"revoked_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "collaborator_id": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"include_documents"?: boolean,"matter_id": string,"permission"?: Database["public"]['Enums']["share_permission"],"revoked_at"?: string | null
                  }
                  Update: {
                    "collaborator_id"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"include_documents"?: boolean,"matter_id"?: string,"permission"?: Database["public"]['Enums']["share_permission"],"revoked_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_shares_collaborator_id_fkey"
      columns: ["collaborator_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_shares_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_shares_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    }
                  ]
                },"matters": {
                  Row: {
                    "area": Database["public"]['Enums']["practice_area"],"client_id": string,"closed_on": string | null,"counterpart": string | null,"counterpart_lawyer": string | null,"court": string | null,"created_at": string,"created_by": string | null,"description": string | null,"file_number": string | null,"file_year": number | null,"forum": string | null,"id": string,"is_sensitive": boolean,"jurisdiction": string,"opened_on": string,"organization_id": string,"secretariat": string | null,"stage": Database["public"]['Enums']["procedural_stage"],"stage_changed_at": string,"status": Database["public"]['Enums']["matter_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area": Database["public"]['Enums']["practice_area"],"client_id": string,"closed_on"?: string | null,"counterpart"?: string | null,"counterpart_lawyer"?: string | null,"court"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"file_number"?: string | null,"file_year"?: number | null,"forum"?: string | null,"id"?: string,"is_sensitive"?: boolean,"jurisdiction"?: string,"opened_on"?: string,"organization_id": string,"secretariat"?: string | null,"stage"?: Database["public"]['Enums']["procedural_stage"],"stage_changed_at"?: string,"status"?: Database["public"]['Enums']["matter_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "area"?: Database["public"]['Enums']["practice_area"],"client_id"?: string,"closed_on"?: string | null,"counterpart"?: string | null,"counterpart_lawyer"?: string | null,"court"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"file_number"?: string | null,"file_year"?: number | null,"forum"?: string | null,"id"?: string,"is_sensitive"?: boolean,"jurisdiction"?: string,"opened_on"?: string,"organization_id"?: string,"secretariat"?: string | null,"stage"?: Database["public"]['Enums']["procedural_stage"],"stage_changed_at"?: string,"status"?: Database["public"]['Enums']["matter_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matters_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matters_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matters_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "created_at": string,"is_active": boolean,"organization_id": string,"role": Database["public"]['Enums']["app_role"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"is_active"?: boolean,"organization_id": string,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"is_active"?: boolean,"organization_id"?: string,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"non_working_days": {
                  Row: {
                    "created_at": string,"day": string,"description": string,"kind": Database["public"]['Enums']["non_working_day_kind"],"organization_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day": string,"description": string,"kind"?: Database["public"]['Enums']["non_working_day_kind"],"organization_id": string
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"description"?: string,"kind"?: Database["public"]['Enums']["non_working_day_kind"],"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "non_working_days_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string,"full_name": string,"id": string,"professional_registration": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"full_name"?: string,"id": string,"professional_registration"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"professional_registration"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "log_access":
{ Args: { "p_action": string,"p_record_id": string,"p_table_name": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_role": "titular"|"colaborador","client_kind": "persona"|"empresa","document_type": "DNI"|"CUIT"|"CUIL"|"Pasaporte"|"Otro","entry_kind": "escrito"|"audiencia"|"notificacion"|"resolucion"|"reunion"|"llamada"|"nota"|"otro","event_kind": "audiencia"|"vencimiento"|"reunion"|"tramite"|"recordatorio"|"escrito"|"cedula","event_priority": "normal"|"alta"|"critica","event_status": "pendiente"|"cumplido"|"cancelado","matter_status": "consulta"|"activo"|"en_espera"|"cerrado"|"archivado","non_working_day_kind": "feriado"|"feria_judicial"|"inhabil","practice_area": "familia"|"sucesiones"|"civil"|"laboral"|"violencia_genero"|"otro","procedural_stage": "iniciacion"|"tramite"|"prueba"|"alegatos"|"sentencia"|"recursos"|"ejecucion"|"archivo","share_permission": "lectura"|"comentario"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["titular", "colaborador"],"client_kind": ["persona", "empresa"],"document_type": ["DNI", "CUIT", "CUIL", "Pasaporte", "Otro"],"entry_kind": ["escrito", "audiencia", "notificacion", "resolucion", "reunion", "llamada", "nota", "otro"],"event_kind": ["audiencia", "vencimiento", "reunion", "tramite", "recordatorio", "escrito", "cedula"],"event_priority": ["normal", "alta", "critica"],"event_status": ["pendiente", "cumplido", "cancelado"],"matter_status": ["consulta", "activo", "en_espera", "cerrado", "archivado"],"non_working_day_kind": ["feriado", "feria_judicial", "inhabil"],"practice_area": ["familia", "sucesiones", "civil", "laboral", "violencia_genero", "otro"],"procedural_stage": ["iniciacion", "tramite", "prueba", "alegatos", "sentencia", "recursos", "ejecucion", "archivo"],"share_permission": ["lectura", "comentario"]
          }
        }
} as const
