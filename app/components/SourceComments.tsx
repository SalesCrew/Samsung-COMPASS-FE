import type {CellComment} from '../lib/excelComments';
import './sourceComments.css';

export function SourceComments({comments}:{comments?:readonly CellComment[]}){
 const notes=Array.isArray(comments)?comments.filter(c=>typeof c?.text==='string'&&c.text.trim()):[];
 if(!notes.length)return null;
 return <aside className="source-comments" aria-label="Kommentar aus Excel"><p className="source-comments-label">{notes.length===1?'Kommentar aus Excel':'Kommentare aus Excel'}</p>{notes.map((note,index)=><p className="source-comment-text" key={index}>{note.text}</p>)}</aside>;
}
