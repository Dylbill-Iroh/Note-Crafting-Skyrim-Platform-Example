import { Debug, once, Form, FormList, Book, ObjectReference, printConsole, Game } from 'skyrimPlatform'
import { GetStringValue, SetStringValue, UnsetIntValue, SetIntValue, HasIntValue, SetFormValue } from '@skyrim-platform/papyrus-util/StorageUtil'

once('tick', () => {
    printConsole('Skyrim Platform Test Notecrafting init')
})

once('update', () => {
    printConsole("Skyrim Platform Test Notecrafting load")
    MakeSomeNewBooks()
}) 

function MakeSomeNewBooks(){
    const player = Game.getPlayer()
    if (player){
        printConsole("Player Found")

        //create a new book, model is a red journal and add it to the player. 
        //Using player.addItem(playerNote , 1, false) didn't work from here, which is why you can specifiy an optional init container.
        //Also set CanBeEdited to true to allow the player to edit the book text / name in game.
        //Also set initSetHasBeenOpened to true so that when the player first opens the journal, the notecrafting menu doesn't open. 
        var playerJournal = CreateCustomBook("Player's note text \n yay!", "Player Note", 2, null, player, true, false, true) 
    } 

    //create a new note, not added to any container on init and can't be edited by the player.
    //You'll probably want to move this with newNote.moveTo(someObjectReference)
    let newNote = CreateCustomBook("Note Text", "Note Name", 0)

    if (playerJournal){
        printConsole("playerJournal Name = " + GetBookName(playerJournal))
        printConsole("playerJournal Text = " + GetBookText(playerJournal))
        
    } else {
        printConsole("Couldn't create playerJournal")
    } 

    if (newNote){ 
        newNote.activate(player, false)
        printConsole("newNote Name = " + GetBookName(newNote))
        printConsole("newNote Text = " + GetBookText(newNote))
        
    } else {
        printConsole("Couldn't create newNote")
    } 
}

function trace(sMsg:string, iSeverityLevel:number = 2){
    Debug.trace(sMsg, iSeverityLevel)
} 

function getNC_NoteCraftingAllBlankBooksForm(){
    const NC_NoteCraftingAllBlankBooksForm = Game.getFormFromFile(0x002310, "NoteCrafting.esp") //formlist of books included with the mod
        
    if (NC_NoteCraftingAllBlankBooksForm){
        const NC_NoteCraftingAllBlankBooks = FormList.from(NC_NoteCraftingAllBlankBooksForm)
     
        if (NC_NoteCraftingAllBlankBooks){
            return NC_NoteCraftingAllBlankBooks
        } else {
            trace("Notecrafting getNC_NoteCraftingAllBlankBooksForm: couldn't get NC_NoteCraftingAllBlankBooks formlist from NC_NoteCraftingAllBlankBooksForm")
        }
    } else {
        trace("Notecrafting getNC_NoteCraftingAllBlankBooksForm: NC_NoteCraftingAllBlankBooksForm not found")
    }
}   

function BookTypeHasName(name:string, bookType:number, akBook:Form | null) : boolean {
    if (!akBook ){
        const NC_NoteCraftingAllBlankBooks = getNC_NoteCraftingAllBlankBooksForm()
        
        if (NC_NoteCraftingAllBlankBooks){
            akBook = NC_NoteCraftingAllBlankBooks.getAt(bookType) 
            if (!akBook){
                trace("Notecrafting BookTypeHasName: bookType " + bookType.toString() + " not found in NC_NoteCraftingAllBlankBooks")
                return false
            }
        } else {
            trace("Notecrafting BookTypeHasName: Couldn't find NC_NoteCraftingAllBlankBooks Formlist")
            return false
        }
    }

    return HasIntValue(akBook, "NoteCrafting_NameKey_" + name)
}

//if checkIfNameExists is true, function will add numbers to name until it's unique / not found for the book type. 
//if checkIfNameExists is false and the name already exists for the book type, it will not set the name and return false.
function setBookName(akBookRef:ObjectReference, name:string, checkIfNameExists:boolean) : boolean {
    //trace("Setting book name to " + name)
    //Debug.notification("Setting book name to " + name)

    let baseObjForm = akBookRef.getBaseObject()
    if (!baseObjForm){ 
        trace("Notecrafting SetName: baseObjForm ref base not found")
        return false
    }

    const baseObj = Book.from(baseObjForm)
    if (baseObj){
        let bNameExists:boolean = BookTypeHasName(name, -1, baseObj)
        let bSetName:boolean = false 
        if (akBookRef){
            if (checkIfNameExists){
                if(bNameExists){
                    let i = 1 
                    let iString = i.toString()

                    while (BookTypeHasName((name + " " + iString), -1, baseObj)){
                        i += 1 //add numbers to end of name until it finds a name that is unique
                        iString = i.toString()
                        trace("i = " + iString)
                    }
                    name = name + " " + iString
                }
                bSetName = true
            } else if(!bNameExists){
                bSetName = true
            }
        } else {
            trace("Notecrafting SetName: akBookRef doesn't exist")
            return false
        }

        if (bSetName){
            let currentName = GetStringValue(akBookRef, "NoteCrafting_Name", akBookRef.getDisplayName())
            SetStringValue(akBookRef, "NoteCrafting_Name", name)
            SetIntValue(baseObj, "NoteCrafting_NameKey_" + name, 1) //for the BookNameExists function. Setting this is faster than checking every book object reference for the passed in name. 
            UnsetIntValue(baseObj, "NoteCrafting_NameKey_" + currentName) //clear name key for use with BookNameExists function
            //akBookRef.setDisplayName(name, false) //this causes ctd from here, so it will be set with papyrus with OnInit event in the NoteCraftingObjRefScript
            return true
        }
    } else {
        trace("NoteCrafting SetName, baseObj book not found")
        return false
    }
    
    return false
}

function GetBookName(akBookRef:ObjectReference){
    if (akBookRef){
        return GetStringValue(akBookRef, "NoteCrafting_Name", "")
    } 
    return ""
}

//Set text of custom note or book
function SetBookText(akBookRef:ObjectReference, text:string) : boolean {
    let nText:string = text.replace("\n", "|n|") //anything after new lines are not saved in storageUtil when saving game. This is a workaround for saving new lines.
    SetStringValue(akBookRef, "noteCrafting_text", nText) 
    return (GetStringValue(akBookRef, "noteCrafting_text") === nText)
}

//Get text of custom note / book
function GetBookText(akBookRef:ObjectReference) : string {
    let text = GetStringValue(akBookRef, "noteCrafting_text")
    return text.replace("|n|", "\n") //anything after new lines are not saved in storageUtil when saving game. This is a workaround for saving new lines.
}

//Set whether a custom note / journal can be edited by the user or not
function SetBookCanBeEdited(akBookRef:ObjectReference, CanBeEdited:boolean){
    SetIntValue(akBookRef, "NoteCrafting_CanBeEdited", Number(CanBeEdited))
}

//Create a new custom Note / Journal and return the object reference. 
//if CanBeEddited is true, users can edit name / text in game. 
//If initSetHasBeenOpened is true, the note crafting menu won't open the first time the user opens the note, if canBeEdited is also true.
//For bookType parameter, this is for creating note / journals already included with Notecrafting.esp
//0 = note, 1 = brown journal, 2 = red journal, 3 = dark red journal. 
//If the akBook  parameter is not null, that is what will be created.
//If initContainer is not none, the new book will be added to that container upon creation. 
function CreateCustomBook(Text:string, Name:string = "", bookType:number = 0, akBook:Book | undefined | null = null, initContainer:Form | null = null, CanBeEdited:boolean = false, InitiallyDisabled:boolean = false, initSetHasBeenOpened:boolean = false) {
    if (!akBook){
        //trace("create: book param not passed in")
        const NC_NoteCraftingAllBlankBooks = getNC_NoteCraftingAllBlankBooksForm()
        if (NC_NoteCraftingAllBlankBooks){
            //let iSize = NC_NoteCraftingAllBlankBooks.getSize()
            //trace("NC_NoteCraftingAllBlankBooks found, size = " + iSize)

            const bookBaseForm = NC_NoteCraftingAllBlankBooks.getAt(bookType)

            if (bookBaseForm){
                const bookBase = Book.from(bookBaseForm)
                
                if (bookBase) {
                    //trace("Book " + bookBase.getName() + " Found from list") 
                    akBook = bookBase
                } else {
                    trace("Notecrafting Create: a book doesn't exist for the index " + bookType + " in the NC_NoteCraftingAllBlankBooks list", 2)
                    return
                }
            }
        } else {
            //trace("Notecrafting Create: Couldn't find NC_NoteCraftingAllBlankBooks FormList", 2)
            trace("Notecrafting Create: Couldn't find NC_NoteCraftingAllBlankBooks FormList")
            return // couldn't find book formlist
        }
    } 

    if (akBook) {
        // if (akBook as NoteCraftingBaseBookObjScript) { // not sure how to implement this check
        const NC_EmptyCellRefForm = Game.getFormFromFile(0x0012CB, "NoteCrafting.esp") //formlist of books included with the mod
        let NC_EmptyCellRef = null
        if (NC_EmptyCellRefForm){ 
            NC_EmptyCellRef = ObjectReference.from(NC_EmptyCellRefForm)
        } else {
            trace("Notecrafting Create: NC_EmptyCellRefForm not found")
        }

        if (!NC_EmptyCellRef){
            trace("Notecrafting Create: NC_EmptyCellRef not found, setting to player")
            const player = Game.getPlayer() 
            if (player){
                NC_EmptyCellRef = (ObjectReference.from(player))
            } else {
                trace("Notecrafting Create: player not found, aborting function")
                return
            }
        }

        if (NC_EmptyCellRef){
            let bookRef = NC_EmptyCellRef.placeAtMe(akBook, 1, true, InitiallyDisabled) 
            if (bookRef){
            // if (bookRef as NoteCraftingObjRefScript){ // not sure how to implement this check
                //trace("bookRef created successfully")
                if (Name != ""){
                    setBookName(bookRef, Name, true)
                } 

                SetBookCanBeEdited(bookRef, CanBeEdited)
                if (initSetHasBeenOpened){
                    SetIntValue(bookRef, "NoteCrafting_InitSetHasBeenOpened", 1) 
                } 

                if (initContainer){
                    SetFormValue(bookRef, "NoteCrafting_InitContainer", initContainer)
                }
                SetBookText(bookRef, Text)

                return bookRef
            } else {
                trace("notecrafting create: placeAtMe failed")
                return
            }
        } else {
            trace("notecrafting create: NC_EmptyCellRef not found and failed to set as the player.")
            return
        }
            
    } else {
        trace("notecrafting create: book not found or set")
    }
}
