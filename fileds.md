sales stage

"options": "[{\"value\":\"11\",\"label\":\"New Lead\"},{\"value\":\"12\",\"label\":\"Qualified Prospect\"},{\"value\":\"13\",\"label\":\"Visit Scheduled\"},{\"value\":\"14\",\"label\":\"Consideration\"},{\"value\":\"15\",\"label\":\"Committed\"},{\"value\":\"16\",\"label\":\"Closed - Won\"},{\"value\":\"17\",\"label\":\"Closed - Lost\"}]"


recent activity

"options": "[{\"value\":\"20\",\"label\":\"Active more than a month ago\",\"color\":\"#e64a19\",\"backgroundColor\":\"#fadbd1\"},{\"value\":\"19\",\"label\":\"Active in the last month\",\"color\":\"#fdd835\",\"backgroundColor\":\"#fff7d7\"},{\"value\":\"18\",\"label\":\"Active in the last week\",\"color\":\"#689f38\",\"backgroundColor\":\"#e1ecd7\"}]"

account type
"options": "[{\"value\":\"679\",\"label\":\"Contact\"},{\"value\":\"678\",\"label\":\"Company\"}]"


inquiry status

"options": "[{\"value\":\"209\",\"label\":\"New Inquiry\",\"color\":\"#d81b60\",\"backgroundColor\":\"#f7d1df\"},{\"value\":\"801\",\"label\":\"Not Allocated\",\"color\":\"#d81b60\",\"backgroundColor\":\"#f7d1df\"},{\"value\":\"609\",\"label\":\"Contact Client\",\"color\":\"#ab47bc\",\"backgroundColor\":\"#eedaf2\"},{\"value\":\"208\",\"label\":\"Contact For Site Visit\",\"color\":\"#8e24aa\",\"backgroundColor\":\"#e8d3ee\"},{\"value\":\"207\",\"label\":\"Site Visit Scheduled\",\"color\":\"#ffb300\",\"backgroundColor\":\"#fff0cc\"},{\"value\":\"206\",\"label\":\"Site Visit to be Re-Scheduled\",\"color\":\"#fb8c00\",\"backgroundColor\":\"#fee8cc\"},{\"value\":\"205\",\"label\":\"Generate Quote\",\"color\":\"#00acc1\",\"backgroundColor\":\"#cceef3\"},{\"value\":\"204\",\"label\":\"Quote Created\",\"color\":\"#43a047\",\"backgroundColor\":\"#d9ecda\"},{\"value\":\"506\",\"label\":\"Completed\",\"color\":\"#43a047\",\"backgroundColor\":\"#d9ecda\"},{\"value\":\"505\",\"label\":\"Cancelled\",\"color\":\"#000000\",\"backgroundColor\":\"#cccccc\"},{\"value\":\"696\",\"label\":\"Expired\",\"color\":\"#757575\",\"backgroundColor\":\"#e3e3e3\"}]"

inquiry source

"options": "[{\"value\":\"191\",\"label\":\"Web Form\"},{\"value\":\"190\",\"label\":\"Phone Call\"},{\"value\":\"189\",\"label\":\"Email\"},{\"value\":\"188\",\"label\":\"SMS\"}]"



type

"options": "[{\"value\":\"223\",\"label\":\"General Inquiry\"},{\"value\":\"222\",\"label\":\"Service Request or Quote\"},{\"value\":\"221\",\"label\":\"Product or Service Information\"},{\"value\":\"220\",\"label\":\"Customer Support or Technical Assistance\"},{\"value\":\"219\",\"label\":\"Billing and Payment\"},{\"value\":\"218\",\"label\":\"Appointment Scheduling or Rescheduling\"},{\"value\":\"217\",\"label\":\"Feedback or Suggestions\"},{\"value\":\"214\",\"label\":\"Complaint or Issue Reporting\"},{\"value\":\"216\",\"label\":\"Partnership or Collaboration Inquiry\"},{\"value\":\"215\",\"label\":\"Job Application or Career Opportunities\"},{\"value\":\"213\",\"label\":\"Media or Press Inquiry\"}]"


how did you hear

"options": "[{\"value\":\"187\",\"label\":\"Google\"},{\"value\":\"186\",\"label\":\"Bing\"},{\"value\":\"185\",\"label\":\"Facebook\"},{\"value\":\"184\",\"label\":\"Yellow Pages\"},{\"value\":\"183\",\"label\":\"Referral\"},{\"value\":\"182\",\"label\":\"Car Signage\"},{\"value\":\"181\",\"label\":\"Returning Customers\"},{\"value\":\"180\",\"label\":\"Other\"}]"



noise signs -- lsit selection field

"options": "[{\"value\":\"768\",\"label\":\"Fighting\"},{\"value\":\"767\",\"label\":\"Walking\"},{\"value\":\"766\",\"label\":\"Heavy\"},{\"value\":\"765\",\"label\":\"Footsteps\"},{\"value\":\"764\",\"label\":\"Running\"},{\"value\":\"763\",\"label\":\"Scurrying\"},{\"value\":\"762\",\"label\":\"Thumping\"},{\"value\":\"761\",\"label\":\"Hissing\"},{\"value\":\"760\",\"label\":\"Shuffle\"},{\"value\":\"759\",\"label\":\"Scratching\"},{\"value\":\"758\",\"label\":\"Can hear coming & going\"},{\"value\":\"757\",\"label\":\"Movement\"},{\"value\":\"756\",\"label\":\"Gnawing\"},{\"value\":\"755\",\"label\":\"Rolling\"},{\"value\":\"754\",\"label\":\"Dragging\"},{\"value\":\"753\",\"label\":\"Squeaking\"},{\"value\":\"752\",\"label\":\"Galloping\"},{\"value\":\"751\",\"label\":\"Poss Pee\"},{\"value\":\"750\",\"label\":\"Fast\"},{\"value\":\"749\",\"label\":\"Slow\"},{\"value\":\"748\",\"label\":\"Bad Smell\"}]"



pest location - list selection field

"options": "[{\"value\":\"735\",\"label\":\"Upper Ceiling\"},{\"value\":\"734\",\"label\":\"Between floors\"},{\"value\":\"733\",\"label\":\"In Walls\"},{\"value\":\"732\",\"label\":\"In House\"},{\"value\":\"731\",\"label\":\"Chimney\"},{\"value\":\"730\",\"label\":\"Garage\"},{\"value\":\"729\",\"label\":\"Kitchen\"},{\"value\":\"728\",\"label\":\"Hand Catch\"},{\"value\":\"727\",\"label\":\"On roof\"},{\"value\":\"726\",\"label\":\"Underneath House\"},{\"value\":\"725\",\"label\":\"Under Solar Panels\"}]"


pest active yimes - list selection field


"options": "[{\"value\":\"747\",\"label\":\"Dawn\"},{\"value\":\"746\",\"label\":\"Dusk\"},{\"value\":\"745\",\"label\":\"Dusk & Dawn\"},{\"value\":\"744\",\"label\":\"During Day\"},{\"value\":\"743\",\"label\":\"Middle of night\"},{\"value\":\"742\",\"label\":\"Night\"},{\"value\":\"741\",\"label\":\"Early morning\"},{\"value\":\"740\",\"label\":\"Evening\"},{\"value\":\"739\",\"label\":\"1-2 am\"},{\"value\":\"738\",\"label\":\"3-4 am\"},{\"value\":\"737\",\"label\":\"7 - 8 pm\"},{\"value\":\"736\",\"label\":\"7.30-10 pm\"}]"



query calcServices {
  calcServices(
    query: [{ where: { service_type: "Primary" } }]
  ) {
    ID: field(arg: ["id"])
    Service_Name: field(arg: ["service_name"])
  }
}
