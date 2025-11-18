const CALC_DEALS_QUERY = `
          query calcDeals($id: PeterpmDealID!) {
            calcDeals(query: [{ where: { id: $id } }]) {
              Service_Provider_ID: field(arg: ["service_provider_id"])
              Popup_Comment: field(arg: ["Primary_Contact", "popup_comment"])
              Deal_Name: field(arg: ["deal_name"])
              Deal_Value: field(arg: ["deal_value"])
              Sales_Stage: field(arg: ["sales_stage"])
              Expected_Win: field(arg: ["expected_win"])
              Expected_Close_Date: field(arg: ["expected_close_date"])
                @dateFormat(value: "DD-MM-YYYY")
              Actual_Close_Date: field(arg: ["actual_close_date"])
                @dateFormat(value: "DD-MM-YYYY")
              Weighted_Value: field(arg: ["weighted_value"])
              Recent_Activity: field(arg: ["recent_activity"])
            }
          }
        `;

const UPDATE_DEAL_MUTATION = `
          mutation updateDeal($id: PeterpmDealID!, $payload: DealUpdateInput = null) {
            updateDeal(query: [{ where: { id: $id } }], payload: $payload) {
              service_provider_id

            }
          }
        `;

const UPDATE_CONTACT_MUTATION = `
          mutation updateContact($id: PeterpmContactID!, $payload: ContactUpdateInput = null) {
            updateContact(query: [{ where: { id: $id } }], payload: $payload) {
              popup_comment
            }
          }
        `;

const UPDATE_JOB_MUTATION = `
          mutation updateJob($id: PeterpmJobID!, $payload: JobUpdateInput = null) {
            updateJob(query: [{ where: { id: $id } }], payload: $payload) {
              admin_recommendation
              quote_date
              follow_up_date
              quote_status
              date_quote_sent
              date_quoted_accepted
              create_a_callback
            }
          }
        `;

const CREATE_UPLOAD_MUTATION = `
          mutation createUpload($payload: UploadCreateInput = null) {
            createUpload(payload: $payload) {
              photo_upload
              file_upload
              job_id
            }
          }
        `;

const CREATE_JOB_MUTATION = `
          mutation createJob($payload: JobCreateInput = null) {
            createJob(payload: $payload) {
              Inquiry_Record {
                id
              }
            }
          }
        `;

const CALC_JOBS_QUERY = `
          query calcJobs($inquiry_record_id: PeterpmDealID!) {
            calcJobs(query: [{ where: { inquiry_record_id: $inquiry_record_id } }]) {
              Inquiry_Record_ID: field(arg: ["Inquiry_Record", "id"])
              ID: field(arg: ["id"])
              Unique_ID: field(arg: ["unique_id"])
              Quote_Date: field(arg: ["quote_date"])
                @dateFormat(value: "DD/MM/YYYY")
              Quote_Total: field(arg: ["quote_total"])
              Quote_Status: field(arg: ["quote_status"])
              Follow_Up_Date: field(arg: ["follow_up_date"])
                @dateFormat(value: "DD/MM/YYYY")
              Date_Quote_Sent: field(arg: ["date_quote_sent"])
                @dateFormat(value: "DD/MM/YYYY")
              Date_Quoted_Accepted: field(arg: ["date_quoted_accepted"])
                @dateFormat(value: "DD/MM/YYYY")
            }
          }
        `;

const CREATE_ACTIVITY_MUTATION = `
          mutation createActivity($payload: ActivityCreateInput = null) {
            createActivity(payload: $payload) {
              task
              option
              activity_price
              activity_text
              warranty
              note
              invoice_to_client
              job_id
              Service {
                id
              }
            }
          }
        `;

const UPDATE_ACTIVITY_MUTATION = `
          mutation updateActivity($id: PeterpmActivityID!, $payload: ActivityUpdateInput = null) {
            updateActivity(query: [{ where: { id: $id } }], payload: $payload) {
              id
            }
          }
        `;

const DELETE_ACTIVITY_MUTATION = `
          mutation deleteActivity($id: PeterpmActivityID!) {
            deleteActivity(query: [{ where: { id: $id } }]) {
              id
            }
          }
        `;

const FULL_JOB_QUERY = `
      query calcJobs($id: PeterpmJobID!) {
        calcJobs(query: [{ where: { id: $id } }]) {
          Accepted_Quote_Activity_Price: field(
            arg: ["accepted_quote_activity_price"]
          )
          Account_Type: field(arg: ["account_type"])
          Accounts_Contact_ID: field(arg: ["accounts_contact_id"])
          Activities_on_Job: field(arg: ["activities_on_job"])
          Activities_to_Complete: field(
            arg: ["activities_to_complete"]
          )
          Admin_Recommendation: field(
            arg: ["admin_recommendation"]
          )
          All_Files_Submitted: field(arg: ["all_files_submitted"])
          All_Forms_Submitted: field(arg: ["all_forms_submitted"])
          All_Photos_Submitted: field(
            arg: ["all_photos_submitted"]
          )
          Bill_Approval_Time: field(arg: ["bill_approval_time"])
          Bill_Approved_Admin: field(arg: ["bill_approved_admin"])
          Bill_Approved_Service_Provider: field(
            arg: ["bill_approved_service_provider"]
          )
          Bill_Batch_Date: field(arg: ["bill_batch_date"])
          Bill_Batch_ID: field(arg: ["bill_batch_id"])
          Bill_Batch_Week: field(arg: ["bill_batch_week"])
          Bill_Date: field(arg: ["bill_date"])
          Bill_Due_Date: field(arg: ["bill_due_date"])
          Bill_GST: field(arg: ["bill_gst"])
          Bill_Time_Paid: field(arg: ["bill_time_paid"])
          Bill_Total: field(arg: ["bill_total"])
          Bill_Xero_ID: field(arg: ["bill_xero_id"])
          Calculate_Job_Price: field(arg: ["calculate_job_price"])
          Calculate_Quote_Price: field(
            arg: ["calculate_quote_price"]
          )
          Client_Entity_ID: field(arg: ["client_entity_id"])
          Client_Individual_ID: field(
            arg: ["client_individual_id"]
          )
          Date_Booked: field(arg: ["date_booked"])
          Date_Cancelled: field(arg: ["date_cancelled"])
          Date_Completed: field(arg: ["date_completed"])
          Date_Feedback_Requested: field(
            arg: ["date_feedback_requested"]
          )
          Date_Feedback_Submitted: field(
            arg: ["date_feedback_submitted"]
          )
          Date_Quote_Requested: field(
            arg: ["date_quote_requested"]
          )
          Date_Quote_Sent: field(arg: ["date_quote_sent"])
          Date_Quoted_Accepted: field(
            arg: ["date_quoted_accepted"]
          )
          Date_Scheduled: field(arg: ["date_scheduled"])
          Date_Started: field(arg: ["date_started"])
          Deduct_Total: field(arg: ["deduct_total"])
          DEL_Activities_to_Complete: field(
            arg: ["del_activities_to_complete"]
          )
          Due_Date: field(arg: ["due_date"])
          Email_BC_Quote_FU: field(arg: ["email_bc_quote_fu"])
          Email_Customer_Job_Email: field(
            arg: ["email_customer_job_email"]
          )
          Email_Electronic_Quote: field(
            arg: ["email_electronic_quote"]
          )
          Email_Manual_Quote: field(arg: ["email_manual_quote"])
          Email_O_Quote_FU: field(arg: ["email_o_quote_fu"])
          Email_RE_Quote_FU: field(arg: ["email_re_quote_fu"])
          Email_Tenant_Job_Email: field(
            arg: ["email_tenant_job_email"]
          )
          Feedback_Number: field(arg: ["feedback_number"])
          Feedback_Status: field(arg: ["feedback_status"])
          Feedback_Text: field(arg: ["feedback_text"])
          Follow_Up_Date: field(arg: ["follow_up_date"])
          ID: field(arg: ["id"])
          Inquiry_Record_ID: field(arg: ["inquiry_record_id"])
          Invoice_Date: field(arg: ["invoice_date"])
          Invoice_ID: field(arg: ["invoice_id"])
          Invoice_Number: field(arg: ["invoice_number"])
          Invoice_Total: field(arg: ["invoice_total"])
          Invoice_URL_Admin: field(arg: ["invoice_url_admin"])
          Invoice_URL_Client: field(arg: ["invoice_url_client"])
          IP_Address: field(arg: ["ip_address"])
          Job_Activity_Subtotal: field(
            arg: ["job_activity_subtotal"]
          )
          Job_Call_Backs: field(arg: ["job_call_backs"])
          Job_GST: field(arg: ["job_gst"])
          Job_Status: field(arg: ["job_status"])
          Job_Status_Old: field(arg: ["job_status_old"])
          Job_Total: field(arg: ["job_total"])
          Job_Type: field(arg: ["job_type"])
          Job_Variation_Price: field(arg: ["job_variation_price"])
          Job_Variation_Text: field(arg: ["job_variation_text"])
          Job_Variation_Type: field(arg: ["job_variation_type"])
          Location_Name: field(arg: ["location_name"])
          Mark_Complete: field(arg: ["mark_complete"])
          Materials_Total: field(arg: ["materials_total"])
          Noise_Signs_Options_As_Text: field(
            arg: ["noise_signs_options_as_text"]
          )
          Options_on_Quote: field(arg: ["options_on_quote"])
          Past_Job_ID: field(arg: ["past_job_id"])
          Payment_ID: field(arg: ["payment_id"])
          Payment_Method: field(arg: ["payment_method"])
          Payment_Status: field(arg: ["payment_status"])
          PCA_Done: field(arg: ["pca_done"])
          Possum_Comment: field(arg: ["possum_comment"])
          Possum_Number: field(arg: ["possum_number"])
          Prestart_Done: field(arg: ["prestart_done"])
          Prestart_Form_Submitted: field(
            arg: ["prestart_form_submitted"]
          )
          Primary_Service_Provider_ID: field(
            arg: ["primary_service_provider_id"]
          )
          Priority: field(arg: ["priority"])
          Profile_Image: field(arg: ["profile_image"])
          Property_ID: field(arg: ["property_id"])
          Quote_Date: field(arg: ["quote_date"])
          Quote_GST: field(arg: ["quote_gst"])
          Quote_Note: field(arg: ["quote_note"])
          Quote_Status: field(arg: ["quote_status"])
          Quote_Total: field(arg: ["quote_total"])
          Quote_Valid_Until: field(arg: ["quote_valid_until"])
          Quote_Variation_Price: field(
            arg: ["quote_variation_price"]
          )
          Quote_Variation_Text: field(
            arg: ["quote_variation_text"]
          )
          Quote_Variation_Type: field(
            arg: ["quote_variation_type"]
          )
          Quoted_Activities_Subtotal: field(
            arg: ["quoted_activities_subtotal"]
          )
          Rating: field(arg: ["rating"])
          Referrer_ID: field(arg: ["referrer_id"])
          Reimburse_Total: field(arg: ["reimburse_total"])
          Request_Review: field(arg: ["request_review"])
          Reset_Batch_ID: field(arg: ["reset_batch_id"])
          Return_Job_to_Admin: field(arg: ["return_job_to_admin"])
          Send_Job_Update_to_Service_Provider: field(
            arg: ["send_job_update_to_service_provider"]
          )
          Signature: field(arg: ["signature"])
          Tasks_on_Quote: field(arg: ["tasks_on_quote"])
          Terms_and_Conditions_Accepted: field(
            arg: ["terms_and_conditions_accepted"]
          )
          Time_Terms_and_Conditions_Agreed: field(
            arg: ["time_terms_and_conditions_agreed"]
          )
          Turkey_Comment: field(arg: ["turkey_comment"])
          Turkey_Number: field(arg: ["turkey_number"])
          Turkey_Release_Site: field(arg: ["turkey_release_site"])
          View_Job_Photos_published: field(
            arg: ["view_job_photos_published"]
          )
          View_Job_Photos_unique_visits: field(
            arg: ["view_job_photos_unique_visits"]
          )
          View_Job_Photos_URL: field(arg: ["view_job_photos_url"])
          View_Job_Photos_visits: field(
            arg: ["view_job_photos_visits"]
          )
          Xero_API_Response: field(arg: ["xero_api_response"])
          Xero_Bill_Status: field(arg: ["xero_bill_status"])
          Xero_Invoice_PDF: field(arg: ["xero_invoice_pdf"])
          Xero_Invoice_Status: field(arg: ["xero_invoice_status"])
        }
      }
`;

const DUPLICATE_JOB_QUERY = `
      mutation createJob($payload: JobCreateInput = null) {
        createJob(payload: $payload) {
          accepted_quote_activity_price
          account_type
          accounts_contact_id
          activities_on_job
          activities_to_complete
          admin_recommendation
          all_files_submitted
          all_forms_submitted
          all_photos_submitted
          bill_approval_time
          bill_approved_admin
          bill_approved_service_provider
          bill_batch_date
          bill_batch_id
          bill_batch_week
          bill_date
          bill_due_date
          bill_gst
          bill_time_paid
          bill_total
          bill_xero_id
          calculate_job_price
          calculate_quote_price
          client_entity_id
          client_individual_id
          date_booked
          date_cancelled
          date_completed
          date_feedback_requested
          date_feedback_submitted
          date_quote_requested
          date_quote_sent
          date_quoted_accepted
          date_scheduled
          date_started
          deduct_total
          del_activities_to_complete
          due_date
          email_bc_quote_fu
          email_customer_job_email
          email_electronic_quote
          email_manual_quote
          email_o_quote_fu
          email_re_quote_fu
          email_tenant_job_email
          feedback_number
          feedback_status
          feedback_text
          follow_up_date
          id
          inquiry_record_id
          invoice_date
          invoice_id
          invoice_number
          invoice_total
          invoice_url_admin
          invoice_url_client
          ip_address
          job_activity_subtotal
          job_call_backs
          job_gst
          job_status
          job_status_old
          job_total
          job_type
          job_variation_price
          job_variation_text
          job_variation_type
          location_name
          mark_complete
          materials_total
          noise_signs_options_as_text
          options_on_quote
          past_job_id
          payment_id
          payment_method
          payment_status
          pca_done
          possum_comment
          possum_number
          prestart_done
          prestart_form_submitted
          primary_service_provider_id
          priority
          profile_image
          property_id
          quote_date
          quote_gst
          quote_note
          quote_status
          quote_total
          quote_valid_until
          quote_variation_price
          quote_variation_text
          quote_variation_type
          quoted_activities_subtotal
          rating
          referrer_id
          reimburse_total
          request_review
          reset_batch_id
          return_job_to_admin
          send_job_update_to_service_provider
          signature
          tasks_on_quote
          terms_and_conditions_accepted
          time_terms_and_conditions_agreed
          turkey_comment
          turkey_number
          turkey_release_site
          view_job_photos_published
          view_job_photos_unique_visits
          view_job_photos_url
          view_job_photos_visits
          xero_api_response
          xero_bill_status
          xero_invoice_pdf
          xero_invoice_status
        }
      }
`;

const DELETE_JOB_QUERY = `
  mutation deleteJob($id: PeterpmJobID!) {
    deleteJob(query: [{ where: { id: $id } }]) {
      id
    }
  }
`;

const CREATE_JOB_TASK = `
  mutation createTask($payload: TaskCreateInput = null) {
    createTask(payload: $payload) {
      Job_id 
      subject 
      date_due 
      details 
      assignee_id
    }
  }
`;

const JOB_TASKS_QUERY = `query calcTasks($Job_id: PeterpmJobID!) {
  calcTasks(query: [{ where: { Job_id: $Job_id } }]) {
    Subject: field(arg: ["subject"])
    Assignee_ID: field(arg: ["assignee_id"])
    Date_Due: field(arg: ["date_due"])
    Details: field(arg: ["details"])
    Assignee_First_Name: field(
      arg: ["Assignee", "first_name"]
    )
    Assignee_Last_Name: field(
      arg: ["Assignee", "last_name"]
    )
    AssigneeEmail: field(arg: ["Assignee", "email"])
    ID: field(arg: ["id"])
    Status: field(arg: ["status"])
  }
}
`;

const UPDATE_TASK_MUTATION = `
  mutation updateTask($id: PeterpmTaskID!, $payload: TaskUpdateInput = null) {
    updateTask(query: [{ where: { id: $id } }], payload: $payload) {
      assignee_id
      date_due
      status
    }
  }
`;

const CREATE_PROPERTY_CONTACT_MUTATION = `
    mutation upsertPropertyContact($payload: PropertyContactCreateInput!) {
      createPropertyContact(payload: $payload) {
        id
      }
    }
  `;

const CALC_CONTACTS_QUERY = `
  query calcContacts(
    $limit: IntScalar
    $offset: IntScalar
    $searchExpression: String!
  ) {
    calcContacts(
      query: [
        {
          where: {
            first_name: null
            _OPERATOR_: like
            _VALUE_EXPRESSION_: $searchExpression
          }
        }
        {
          orWhere: {
            last_name: null
            _OPERATOR_: like
            _VALUE_EXPRESSION_: $searchExpression
          }
        }
        {
          orWhere: {
            email: null
            _OPERATOR_: like
            _VALUE_EXPRESSION_: $searchExpression
          }
        }
      ]
      limit: $limit
      offset: $offset
      orderBy: [{ path: ["first_name"], type: asc }]
    ) {
      Contact_ID: field(arg: ["id"])
      First_Name: field(arg: ["first_name"])
      Last_Name: field(arg: ["last_name"])
      Email: field(arg: ["email"])
      SMS_Number: field(arg: ["sms_number"])
    }
  }
`;

const CREATE_CONTACT_MUTAION = `
  mutation createContact(
    $payload: ContactCreateInput = null
  ) {
    createContact(payload: $payload) {
      id
      first_name
      last_name
      email
      sms_number
    }
  }
`;

const CREATE_AFFILIATION_MUTATION = `mutation createAffiliation(
  $payload: AffiliationCreateInput = null
) {
  createAffiliation(payload: $payload) {
    contact_id
    role
    property_id
  }
}
`;

const UPDATE_AFFILIATION_MUTATION = `mutation updateAffiliation(
  $id: PeterpmAffiliationID!,
  $payload: AffiliationUpdateInput = null
) {
  updateAffiliation(query: [{ where: { id: $id } }], payload: $payload) {
    id
    role
    contact_id
    property_id
  }
}
`;

const DELETE_AFFILIATION_QUERY =`mutation deleteAffiliation($id: PeterpmAffiliationID!) {
  deleteAffiliation(query: [{ where: { id: $id } }]) {
    id
  }
}`
;

const SUBSCRIBE_FORUM_POSTS = `
  subscription subscribeToForumPosts(
    $relatedinquiryid: PeterpmDealID!
    $relatedjobid: PeterpmJobID!
    $limit: IntScalar
    $offset: IntScalar
  ) {
    subscribeToForumPosts(
      query: [
        { where: { related_inquiry_id: $relatedinquiryid } }
        { orWhere: { related_job_id: $relatedjobid } }
      ]
      limit: $limit
      offset: $offset
      orderBy: [{ path: ["created_at"], type: asc }]
    ) {
      Author_ID: author_id
      Date_Added: created_at
      File: file
      ID: id
      Post_Copy: post_copy
      Post_Image: post_image
      Post_Status: post_status
      Unique_ID: unique_id
      Author {
        id
        first_name
        last_name
        display_name
        profile_image
      }
      ForumComments {
        created_at
        comment
        comment_status
        Author {
          id
          first_name
          last_name
          display_name
          profile_image
        }
      }
    }
  }
`;

const CREATE_FORUM_POST_MUTATION = `
  mutation createForumPost($payload: ForumPostCreateInput = null) {
    createForumPost(payload: $payload) {
      Author_ID: author_id
      File: file
      Post_Copy: post_copy
      Post_Image: post_image
    }
  }
`;

const CREATE_FORUM_COMMENT_MUTATION = `
  mutation createForumComment($payload: ForumCommentCreateInput = null) {
    createForumComment(payload: $payload) {
      forum_post_id
      comment
      author_id
    }
  }
`;

const DELETE_FORUM_COMMENT_MUTATION = `
  mutation deleteForumComment($id: PeterpmForumCommentID!) {
    deleteForumComment(query: [{ where: { id: $id } }]) {
      id
    }
  }
`;

const DELETE_FORUM_POST_MUTATION = `
  mutation deleteForumPost($id: PeterpmForumPostID!) {
    deleteForumPost(query: [{ where: { id: $id } }]) {
      id
    }
  }
`;
