based on inqury account ype, quote crete should send account type to quote too and alos either client indivdual or client entity. then based on account type, job email contact shoul dbe pre filled based on client indiviudal email and if in case of company, check primary person email here is the details query break down

query getJob {
  getJob {
    id
    Client_Individual{
      id
      first_name
      last_name
      email
    }
    Client_Entity{
      Primary_Person{
        first_name
        last_name
        email
        id
      }
      }
    }
  }
}

For prefilling job email contanct

so if account type is contact,  use details from client indiviudal, if entitny, similar

For accounts contact, affilations are showing which is good and on submit, we send affiliation id. Account Contact is affilaiton table whereas 

job email  needs to be dynamic. if contact type, we send contact id to client indiviudal field and if entity we send companty id to entity fields similalr y allowing to either add contact or company from dropdown
So summary is, based on account type of inqury, we send account tpe to quote while creating
then from inqury we have Company or primary Contanct. So again based on type, we send primary contanct to client individual or company to client entity
we prefill those while allowing to change in job email and accouunts contact, changing job email should not update inquriy one allow to change only client entity



inquiry section is not shoiwn contact or company details


look below for how is data nested

query getDeal {
  getDeal {
    account_type
    Primary_Contact {
      id
      first_name
      last_name
      email
      sms_number
      address
      city
      state
      zip_code
    }
    Company {
      name
      type
      description
      phone
      address
      city
      state
      postal_code
      industry
      annual_revenue
      number_of_employees
      Primary_Person {
        first_name
        last_name
        email
        id
        sms_number
      }
      account_type
      Body_Corporate_Company {
        name
        type
        description
        phone
        address
        city
        state
        postal_code
        industry
        annual_revenue
        number_of_employees
      }
    }
  }
}
