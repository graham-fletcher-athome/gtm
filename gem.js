import showdown from 'https://cdn.jsdelivr.net/npm/showdown@2.1.0/+esm'

var cvt = new showdown.Converter()

export class gem{
    
    constructor(ID,mc){

        this.ID=ID
        this.parent = $("#"+ID) 
        this.html()
        this.move=null
        this.mc=mc
        
    }

    mid(x){
        return(x+"_"+this.ID)
    }
    midd(x){
        return $("#"+this.mid(x))
    }

    setMove(move){
        this.move=move
    }

    setComment(text){
        this.midd('notes_txt').val(text)
    }

    updateComment(){
        this.mc.moves[this.mc.moveOnBoard-1].comment = this.midd('notes_txt').val()
    }

    html(){
        var self=this
        this.parent.html(`
            <div class="gem_container" style="">
                <div id="${this.mid('context')}" style="text-align: left; width: 100%;"></div>
                <div id="${this.mid('notes')}" style="text-align: left; width: 100%;">
                    <textarea name="newPGNtext" id="${this.mid('notes_txt')}" cols="46" rows="38"></textarea>
                </div>
            </div>
        `)

        
        self.midd("notes_txt").on("keyup",(e)=>{
            self.updateComment()
        })
        self.showNotes()
        
    }

    showNotes()
    {
        this.midd('context').hide()
        this.midd('notes').show()  
    }

    showReport()
    {
        this.midd('context').show()
        this.midd('notes').hide()
    }

    secret_update(event){
        this.key = midd("key").val()
        console.log(this.key)
    }

    

    

    context(pgn){
        
        var self=this
        self.midd("context").html("");
        self.showNotes()
        self.pgn=pgn
        if ((self.secret) && (self.secret.length > 4))
            gemCall({prompt:`
                Identify the game in the pgn below and, if relivant, any historical context. 
                List any published analyses by human authors.
                Summerise the published analyses of the game.
                Your answer should be in an essay style and approximatly 500 words long. 

                The pgn file is:   
                ${pgn}
            `})
            .then(data => {
                self.midd("context").html(data);
                self.showReport()
        
            })
            .catch(error =>{
                console.error("Error:", error);
            })
        else
            self.midd("context").html("");
    }

    



    
}
async function gemCall(parameters) {
    const cloudFunctionUrl = 'https://europe-west2-bipuk-gpf-dev.cloudfunctions.net/gtm-l23t'; // Replace with your actual URL
    parameters['secret'] = "oranges!"
    try {
      const response = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Set the Content-Type header
        },
        body: JSON.stringify(parameters), // Convert your data to JSON
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}, Response: ${errorText}`);
      }
  
      const responseData = await response.text();

      return cvt.makeHtml(responseData);
  
    } catch (error) {
      console.error('Error calling Cloud Function:', error);
      throw error  
    }
  }
  

   